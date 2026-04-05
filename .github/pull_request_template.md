# 📋 PR Checklist - SWE-1.5 Definition of Done

### ✅ PR must include

1. **Feature**: End-to-end path works (even if minimal UI)
   - [ ] User can complete the core workflow
   - [ ] Feature is accessible from UI/navigation

2. **Database**: Migration + seed (if schema changed)
   - [ ] Prisma migration included
   - [ ] Seed data updated if needed
   - [ ] Migration tested locally

3. **Validation**: Zod validation at boundaries (API + forms)
   - [ ] API endpoints have Zod schemas
   - [ ] Form validation implemented
   - [ ] Error handling covers validation failures

4. **RBAC**: Route/endpoint permissions checked
   - [ ] Role-based access control implemented
   - [ ] Protected routes properly gated
   - [ ] Permission tests added

5. **Tests**: Unit tests for logic + at least one integration/E2E path
   - [ ] Unit tests for business logic
   - [ ] Integration test for API endpoints
   - [ ] E2E test for user workflow
   - [ ] All tests pass locally

6. **Telemetry**: Events for key funnel actions + error capture hook
   - [ ] Analytics events implemented
   - [ ] Error tracking added
   - [ ] Funnel events cover user journey

7. **Docs**: README / docs updated (short but accurate)
   - [ ] API documentation updated
   - [ ] Component docs updated
   - [ ] Setup instructions updated

8. **Verification commands**: Lint + typecheck + tests run
   ```bash
   # Web
   cd apps/web && npm run lint && npm run typecheck && npm test
   
   # API  
   cd apps/api && npm run lint && npm run typecheck && npm test
   
   # Mobile
   cd apps/mobile && npm run lint && npm run typecheck && npm test
   ```

### 🚫 Blocked Terms Check
- [ ] No "ngurra", "Ngurra", or "NGURRA" references in code

### 📝 Description
<!-- 
Briefly describe:
1. What this PR does
2. How to test it
3. Any breaking changes
-->

## 🔗 Related Issues
Closes #(issue number)

## 📸 Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## 🧪 Testing Instructions
<!-- Provide clear steps to test the changes -->

---

**Remember**: Every increment must end with working feature + tests + telemetry hooks + verification commands.
