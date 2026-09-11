import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import About from "./pages/About";
import ClubCommunity from "./pages/ClubCommunity";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/rooms/:room" component={RoomDetail} />
      <Route path="/agents" component={Agents} />
      <Route path="/agents/:did" component={AgentDetail} />
      <Route path="/about" component={About} />
      <Route path="/club-community" component={ClubCommunity} />
      <Route component={Home} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
