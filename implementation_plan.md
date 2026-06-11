# Bus Management System Security & Feature Completion

This plan addresses missing UI features and rectifies a frontend routing vulnerability by aligning the folder structure with the route guards.

## User Review Required

> [!IMPORTANT]
> - **Database Schema Update**: We will add a new `parent_profiles` table to store parent names and phone numbers, since `auth.users` cannot be queried by the client. We will create a `supabase_schema_v3.sql` containing this migration.
> - **Moving Routes**: We will move 10+ screens (like `add-student`, `edit-bus`, etc.) from the root `app/` folder into the `app/(admin)/` folder. This is critical because `app/_layout.tsx` relies on the `(admin)` folder group to protect routes from unauthorized users.

## Proposed Changes

### Database Schema

#### [NEW] [supabase_schema_v3.sql](file:///c:/Users/nb200/OneDrive/Documents/Bus-Management-System/supabase_schema_v3.sql)
- Add `parent_profiles` table (`id` UUID PRIMARY KEY, `tenant_id` UUID, `user_id` UUID, `name` TEXT, `phone` TEXT)
- Add RLS policies for `parent_profiles` (Admins can manage, Parents can view their own).
- Update the RPC function `assign_user_role` or create a new RPC `invite_parent` if needed to facilitate easy onboarding.

### Admin Routing Security Fix

Move the following files from `app/` to `app/(admin)/`:
- `add-bus.tsx`
- `edit-bus.tsx`
- `bus-detail.tsx`
- `add-route.tsx`
- `edit-route.tsx`
- `route-detail.tsx`
- `add-student.tsx`
- `edit-student.tsx`
- `student-detail.tsx`
- `payments.tsx`

#### [MODIFY] Multiple Files
Update `router.push('/add-bus')` to `router.push('/(admin)/add-bus')` across:
- `app/(admin)/dashboard.tsx`
- `app/(admin)/students.tsx`
- `app/(admin)/buses.tsx`
- `app/(admin)/routes.tsx`
- And any other files referencing them.

### Parent Management UI

#### [NEW] [app/(admin)/parents.tsx](file:///c:/Users/nb200/OneDrive/Documents/Bus-Management-System/app/(admin)/parents.tsx)
- Create a new screen allowing admins to view all registered parents.
- Add a modal to invite/create a new parent profile.
- Add functionality to link a parent to one or more students (updating the `parent_students` table).

#### [MODIFY] [src/context/DatabaseContext.tsx](file:///c:/Users/nb200/OneDrive/Documents/Bus-Management-System/src/context/DatabaseContext.tsx)
- Add state and functions for `parentProfiles` and `parentStudents`.
- Expose methods: `addParentProfile`, `linkParentToStudent`, `unlinkParentFromStudent`.

#### [MODIFY] [app/(admin)/dashboard.tsx](file:///c:/Users/nb200/OneDrive/Documents/Bus-Management-System/app/(admin)/dashboard.tsx)
- Add a "Parents" quick action grid item.

### Driver Management Enhancements

#### [MODIFY] [app/(admin)/drivers.tsx](file:///c:/Users/nb200/OneDrive/Documents/Bus-Management-System/app/(admin)/drivers.tsx)
- Add a "Generate Login" button for drivers who have not yet linked an auth account. This calls a new/existing RPC to quickly create an account for them so they can log in immediately.

## Verification Plan

### Automated Tests
- Type checking: Run `npx tsc --noEmit` to ensure moved routes and new Context methods do not break types.

### Manual Verification
- Attempt to navigate to `/(admin)/add-student` as a driver. Ensure the route guard rejects the navigation and redirects to the driver dashboard.
- Log in as admin, go to Parents screen, create a parent, link them to a student. Log in as that parent and verify the student shows up on their dashboard.
