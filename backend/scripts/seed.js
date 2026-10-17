// Seeds demo users (admin + customer) and menu items.
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';

const MENU = [
  { name: 'Chicken Biryani', category: 'Main Course', price: 320, description: 'Fragrant basmati rice with spiced chicken' },
  { name: 'Butter Chicken', category: 'Main Course', price: 380, description: 'Creamy tomato gravy, tandoor-charred chicken' },
  { name: 'Paneer Tikka', category: 'Starters', price: 260, description: 'Grilled cottage cheese with mint chutney' },
  { name: 'Beef Tehari', category: 'Main Course', price: 350, description: 'Spiced rice with slow-cooked beef' },
  { name: 'Gulab Jamun', category: 'Desserts', price: 120, description: 'Warm milk dumplings in rose syrup' },
  { name: 'Mango Lassi', category: 'Beverages', price: 110, description: 'Sweet yogurt smoothie' },
  // Pizzas — ordering any pizza should surface the other pizzas in AI recommendations
  { name: 'Onion Pizza', category: 'Pizza', price: 320, description: 'Crispy hand-tossed pizza with caramelized onions and mozzarella' },
  { name: 'Chicken Cheese Pizza', category: 'Pizza', price: 420, description: 'Classic pizza with grilled chicken and double mozzarella cheese' },
  { name: 'Chicken BBQ Supreme Pizza', category: 'Pizza', price: 520, description: 'Supreme pizza with smoky BBQ chicken, capsicum, onions and extra cheese' },
  { name: 'Beef Pepperoni Pizza', category: 'Pizza', price: 480, description: 'Pizza topped with spicy beef pepperoni slices and melted mozzarella' },
  { name: 'Beef Sausage Pizza', category: 'Pizza', price: 460, description: 'Hearty pizza with juicy beef sausage, onions and bubbling cheese' },
];

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const customerPassword = await bcrypt.hash('Customer@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@foodmaza.com' },
    update: {},
    create: { name: 'Restaurant Admin', email: 'admin@foodmaza.com', password: adminPassword, role: 'ADMIN' },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@foodmaza.com' },
    update: {},
    create: { name: 'Demo Customer', email: 'customer@foodmaza.com', password: customerPassword, role: 'CUSTOMER' },
  });

  for (const item of MENU) {
    await prisma.menuItem.upsert({
      where: { id: `seed_${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}` },
      update: {},
      create: { ...item, id: `seed_${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}` },
    });
  }

  console.log('Seed complete:');
  console.log('  ADMIN    → admin@foodmaza.com / Admin@123');
  console.log('  CUSTOMER → customer@foodmaza.com / Customer@123');
  console.log(`  Menu items: ${MENU.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
