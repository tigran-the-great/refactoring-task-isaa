# Order Management System - Refactoring Challenge

## Overview

This is a working Order Management System API built with Node.js, TypeScript, Express, and PostgreSQL. The system handles user authentication, product management, and order processing.

**Your task is to refactor and redesign this system to meet production-ready standards.**

## Current Functionality

The system currently provides the following features:

### Authentication
- User registration
- User login with JWT tokens

### Products
- List all products
- Create new products
- Update product stock

### Orders
- Create orders with multiple items
- List user orders
- Cancel orders
- View order statistics

### Coupons
- List active coupons
- Create coupons with various discount types
- Apply coupons to orders with complex validation rules

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:
```bash
createdb order_system
```

3. Run database schema and seed data:
```bash
psql -d order_system -f database/schema.sql
psql -d order_system -f database/seed.sql
```

4. Copy `.env.example` to `.env` and configure your database connection:
```bash
cp .env.example .env
```

5. Start the development server:
```bash
npm run dev
```

## Your Task

### Primary Objectives

**Refactor and redesign this codebase to demonstrate senior-level engineering skills.** Focus on:

1. **Code Organization & Architecture**
   - Identify and fix architectural issues
   - Implement proper separation of concerns
   - Apply appropriate design patterns

2. **Code Quality**
   - Identify and eliminate code smells
   - Improve error handling
   - Add proper input validation
   - Reduce code duplication

3. **Maintainability & Scalability**
   - Make the codebase easier to test
   - Improve code reusability
   - Design for future extensibility
   - Consider scalability concerns

4. **Best Practices**
   - Apply TypeScript best practices
   - Implement proper security measures
   - Follow Node.js/Express conventions

### What We're Looking For

- **System Design Skills**: How you structure and organize the application
- **Refactoring Abilities**: How you identify and fix code issues
- **Best Practices**: Your knowledge of industry standards and patterns
- **Code Quality**: Clean, readable, maintainable code
- **Problem Identification**: Can you spot the issues in the current implementation?

### Deliverables

1. **Refactored codebase** with improved architecture and code quality
2. **REFACTORING.md** document that explains:
   - What issues you identified
   - What changes you made and why
   - What trade-offs you considered
   - What additional improvements you would make given more time

### Guidelines

- **You can modify any part of the codebase** - nothing is off-limits
- **You can add new dependencies** if they improve the solution
- **The API functionality should remain the same** (same endpoints and behavior)
- **Focus on quality over quantity** - it's better to do fewer things well
- **Document your decisions** - explain your reasoning

### Time Expectation

This task is designed to take 2-4 hours. You don't need to achieve perfection - we want to see your thought process and priorities.

## Evaluation Criteria

You will be evaluated on:

1. **Problem Identification** (25%)
   - Can you identify the issues in the current code?
   - Do you understand the implications of these issues?

2. **Solution Design** (35%)
   - Is your architecture well-structured and scalable?
   - Do you apply appropriate design patterns?
   - Is the code properly organized?

3. **Code Quality** (25%)
   - Is the code clean and readable?
   - Are best practices followed?
   - Is error handling robust?

4. **Communication** (15%)
   - Can you clearly explain your decisions?
   - Do you document your reasoning?
   - Do you consider trade-offs?

## Notes

- The current code **intentionally has issues** - this is part of the challenge
- You're **not expected to make it perfect** - prioritize based on impact
- **Ask questions** if anything is unclear about requirements
- **Focus on demonstrating your skills**, not just making the code work

## API Examples

### Register a user
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Create an order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"items":[{"productId":1,"quantity":2},{"productId":2,"quantity":1}]}'
```

### Apply a coupon to an order
```bash
curl -X POST http://localhost:3000/api/orders/1/apply-coupon \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"couponCode":"WELCOME10"}'
```

Good luck! We look forward to seeing your solution.

