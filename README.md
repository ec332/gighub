# GigHub

A platform connecting employers and employees in the gig economy.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Git

## Getting Started

1. Clone the repository:
```bash
git clone <your-repository-url>
cd gighub
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the environment variables with your values:
```bash
cp .env.example .env
```

Required environment variables:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL=your-database-url
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

Note: The `.next` directory will be automatically generated when you run either `npm run dev` or `npm run build`. You don't need to create or install it manually.

## Available Scripts

- `npm run dev` - Start development server (creates .next directory automatically)
- `npm run build` - Build for production (creates optimized .next directory)
- `npm start` - Start production server (requires .next from build)
- `npm run lint` - Run ESLint
- `npm run test` - Run tests (if configured)

## Features

- User Authentication (NextAuth.js)
- Role-based access (Employer/Employee)
- Dashboard for both user types
- Modern UI with Tailwind CSS

## Contributing

1. Create a new branch
2. Make your changes
3. Submit a pull request
