import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      const path = req.nextUrl.pathname;
      
      if (path.startsWith("/login") || path.startsWith("/register")) {
        return true;
      }
      
      if (path.startsWith("/dashboard")) {
        return !!token;
      }
      
      return true;
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
