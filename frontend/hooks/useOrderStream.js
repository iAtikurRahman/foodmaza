"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL, getToken } from "@/utils/axiosInstance";
import { useAuth } from "@/context/AuthContext";

/**
 * Live order updates over Server-Sent Events (GET /api/orders/stream).
 *
 * The browser's EventSource cannot send an Authorization header, so the
 * stream is read with fetch() and the SSE frames are parsed by hand.
 * Each frame with `event: order` carries:
 *   { orderId, customerId, status, paymentStatus }
 *
 * The connection retries after 3s on network blips/server restarts, stops
 * on 401 (the axios interceptor owns logout), and closes on logout/unmount.
 *
 * @param {(payload: { orderId: string, status: string, paymentStatus: string }) => void} onOrderUpdate
 */
export default function useOrderStream(onOrderUpdate) {
  const { isAuthenticated } = useAuth();
  const callbackRef = useRef(onOrderUpdate);

  // Keep the latest callback without tearing down the connection
  useEffect(() => {
    callbackRef.current = onOrderUpdate;
  }, [onOrderUpdate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    let retryTimer = null;
    let stopped = false;

    function handleFrame(frame) {
      let event = "message";
      const dataLines = [];

      for (const line of frame.split("\n")) {
        if (line.startsWith(":")) continue; // heartbeat comment (": ping")
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }

      if (event !== "order" || dataLines.length === 0) return;
      try {
        callbackRef.current?.(JSON.parse(dataLines.join("\n")));
      } catch {
        // Malformed frame — ignore it, keep the stream alive
      }
    }

    async function connect() {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/stream`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: controller.signal,
        });

        // Expired token: stop here — any axios call fires the global logout
        if (response.status === 401) return;
        if (!response.ok || !response.body) {
          throw new Error(`Stream failed with ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // An SSE frame ends with a blank line
          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            handleFrame(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf("\n\n");
          }
        }

        throw new Error("Stream ended"); // fall through to the retry below
      } catch {
        if (stopped || controller.signal.aborted) return;
        retryTimer = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(retryTimer);
    };
  }, [isAuthenticated]);
}
