import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Protect only the history and the API routes
const isProtectedRoute = createRouteMatcher([
  '/history(.*)',
  '/api/(.*)' 
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};