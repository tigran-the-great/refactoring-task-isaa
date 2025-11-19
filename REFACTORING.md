# Refactoring Documentation

## Overview
This document summarizes the refactoring work performed on the Order Management System API (Node.js, TypeScript, Express, PostgreSQL).  
The goal was to redesign the project into a maintainable, scalable, production-ready codebase **without changing the API behavior**.

---

# 1. Issues Found in the Original Codebase

### 1.1 Single-file architecture
All logic (routing, controllers, SQL, auth, validation) lived in one large `index.ts`.  
This made the system hard to maintain, test, or extend.

### 1.2 No separation of concerns
- Routes contained business logic  
- No controllers/services  
- No middlewares  
- DB queries scattered across code

### 1.3 Repeated logic
- JWT verification duplicated  
- Error handling repeated  
- Stock/product order logic duplicated  
- Coupons validation duplicated

### 1.4 Missing type safety
- No types for `req.user`  
- Many implicit `any` values  
- Controllers not strongly typed

### 1.5 Missing validation & error structure
Inputs were not validated, and error responses were inconsistent.

### 1.6 Weak security practices
- JWT fallback secret  
- No central auth middleware  
- Routes not protected consistently

---

# 2. What Was Refactored

### 2.1 New folder structure
Code reorganized into:

src/
├── app.ts
├── server.ts
├── config/
├── controllers/
├── routes/
├── middlewares/
├── utils/
└── types/


### 2.2 Extracted controllers
Each domain (auth, products, orders, coupons) now has a dedicated controller file.  
Controllers are now thin and focused.

### 2.3 Extracted route modules
Routes now map cleanly to controllers, improving readability & scalability.

### 2.4 Centralized authentication
`authMiddleware.ts`:
- Verifies JWT
- Attaches `req.user` with proper TypeScript typing
- Removes repeated code from controllers

### 2.5 TypeScript improvements
- Added global Express type declarations  
- Stronger typing for JWT payload  
- Safer controller inputs

### 2.6 Database connection cleanup
- Single shared database pool in `config/db.ts`

### 2.7 Cleaner SQL and transactions
- Removed duplicated SQL patterns  
- Improved transaction structure  
- Clearer error handling

### 2.8 Coupon logic cleanup
- Validation unified into logical steps  
- More readable structure

---

# 3. Trade-offs

- Functionality was preserved exactly per requirements  
- Raw SQL kept to avoid large library changes  
- A full service layer was not added due to time constraints  
- Validation libraries (Zod/Joi) were not added but recommended

---

# 4. Future Improvements

If more time was available:

- Add a service layer for business logic  
- Add input validation (Zod)  
- Add role-based access control (admin vs user)  
- Add centralized error-handling middleware  
- Improve logging (Pino/Winston)  
- Add automated DB migrations & tests  
- Add Swagger/OpenAPI documentation

---

# 5. Summary

This refactor delivers:

- A clean, modular architecture  
- Stronger TypeScript typing  
- Reusable middlewares & utilities  
- Easier maintenance & scalability  
- Cleaner routing & controller structure  
- Better separation of concerns  
- Improved security and consistency  
