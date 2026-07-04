import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      id: "password",
      reset: async (params) => {
        // TODO: Implement password reset via email
        // For now, admin can reset via dashboard
        return;
      },
    }),
  ],
});
