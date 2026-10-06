# Proposed Flow:

### 1. The Entrance
* **Splash Screen (`splash.tsx`):** The app loads with your logo and a sleek animation, then automatically transitions to the next screen.
* **Entry Screen (`entry.tsx`):** The main landing page where the user can choose to either "Sign In" or "Create Account".

### 2. The Authentication Flow
* **Signup (`signup.tsx`):** The user creates an account. The app creates their profile in Firebase, automatically fires off a verification email, and routes them to the Verify screen.
* **Verify Email (`verify-email.tsx`):** The user is held here until they click the secure link in their email inbox. Once they tap "I've clicked the link", they are allowed into the app.
* **Login (`login.tsx`):** Returning users enter their credentials. If they haven't verified their email yet, they are bounced back to the Verify Email screen. If they are verified, they go straight to the Dashboard.

### 3. The Onboarding Flow
* **Assessment (`assessment.tsx`):** After a brand new user verifies their email, they land here to answer a few personalization questions about their health goals. Once finished, they enter the main app.

### 4. The Main App (Drawer Menu)
All of these screens are housed inside the side-drawer (hamburger menu) so the user can easily swap between them:
* **Dashboard (`dashboard.tsx`):** The central hub. This is where the interactive 3D human avatar lives, showing their daily progress filling up to 98%, along with their total points score.
* **Core Tasks (`core-tasks.tsx`):** The fixed daily pillars (Sleep, Diet, Mind, Physical). Checking these off fills the avatar and adds points. It includes the logic that prevents checking "Sleep" outside of the 10 PM - 5 AM curfew.
* **Challenges (`challenges.tsx`):** The infinite-scrolling feed of 100+ bonus health tasks pulled from our custom database. 
* **Profile (`profile.tsx`):** Where the user can view their account details, navigate to **Change Password (`change-password.tsx`)**, or log out (which sends them back to the Entry screen). 

