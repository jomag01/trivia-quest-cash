import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center gradient-primary">
      <div className="text-center p-8">
        <h1 className="mb-4 text-6xl font-bold text-gradient-gold">404</h1>
        <p className="mb-6 text-2xl">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/80 text-lg transition-smooth">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
