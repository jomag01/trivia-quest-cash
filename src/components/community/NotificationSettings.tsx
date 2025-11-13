import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from "@/lib/pushNotifications";

export const NotificationSettings = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notSupported, setNotSupported] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setNotSupported(true);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (isSubscribed) {
        const success = await unsubscribeFromPushNotifications(user.id);
        if (success) {
          setIsSubscribed(false);
          toast.success("Push notifications disabled");
        } else {
          toast.error("Failed to disable notifications");
        }
      } else {
        const success = await subscribeToPushNotifications(user.id);
        if (success) {
          setIsSubscribed(true);
          toast.success("Push notifications enabled");
        } else {
          toast.error("Failed to enable notifications. Please allow notification permissions.");
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
      toast.error("Failed to update notification settings");
    } finally {
      setLoading(false);
    }
  };

  if (notSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified when you receive new messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleToggleNotifications}
          disabled={loading}
          variant={isSubscribed ? "outline" : "default"}
        >
          {isSubscribed ? "Disable Notifications" : "Enable Notifications"}
        </Button>
      </CardContent>
    </Card>
  );
};
