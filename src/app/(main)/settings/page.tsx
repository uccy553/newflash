
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { User, Edit3, Bell, Download, Trash2, AlertTriangle } from 'lucide-react'; // Removed Sun, Moon
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
// Removed useTheme import as it's handled in the header

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true); // Placeholder

  // Theme management is now handled by useTheme hook and Header toggle

  const handleExportData = () => {
    // Placeholder for export functionality
    toast({ title: 'Export Data', description: 'This feature is coming soon!' });
  };

  const handleDeleteAccount = () => {
    // Placeholder for delete account functionality
    toast({ title: 'Account Deletion', description: 'Account deletion initiated (Feature coming soon).', variant: 'destructive' });
  };


  return (
    <div className="space-y-10">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">Settings</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><User className="mr-3 h-7 w-7 text-primary"/> Account Information</CardTitle>
          <CardDescription>Manage your profile and account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={currentUser?.photoURL || undefined} alt={currentUser?.displayName || 'User'} />
              <AvatarFallback className="text-2xl">
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : <User />}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xl font-semibold">{currentUser?.displayName || 'User Name'}</p>
              <p className="text-muted-foreground">{currentUser?.email}</p>
            </div>
          </div>
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input id="displayName" defaultValue={currentUser?.displayName || ''} className="max-w-sm" disabled />
              <Button variant="outline" size="icon" disabled title="Edit Display Name (Coming Soon)">
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Display name is managed by your sign-in provider (Google or Email).</p>
          </div>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><Bell className="mr-3 h-7 w-7 text-primary"/> Preferences & Notifications</CardTitle>
          <CardDescription>Customize your app experience and notification settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme toggle removed from here */}
          <div className="flex items-center justify-between">
             <div>
                <Label htmlFor="notifications-toggle" className="text-base font-medium">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive reminders for due reviews and app updates (Coming soon).</p>
             </div>
            <Switch 
                id="notifications-toggle" 
                checked={notificationsEnabled} 
                onCheckedChange={setNotificationsEnabled} 
                disabled 
                aria-label="Toggle notifications"
            />
          </div>

           <div>
            <Label htmlFor="quiz-size">Default Quiz Size</Label>
            <Input id="quiz-size" type="number" defaultValue={10} className="max-w-xs mt-1" disabled />
            <p className="text-xs text-muted-foreground mt-1">Set the number of cards per quiz session (Coming soon).</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg border-destructive/50">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-destructive"><AlertTriangle className="mr-3 h-7 w-7"/> Danger Zone</CardTitle>
          <CardDescription>Manage your account data. These actions are irreversible.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-dashed rounded-md">
            <div>
              <h4 className="font-semibold text-foreground">Export Your Data</h4>
              <p className="text-sm text-muted-foreground">Download all your study cards and quiz history (Feature coming soon).</p>
            </div>
            <Button variant="outline" onClick={handleExportData} disabled>
              <Download className="mr-2 h-4 w-4" /> Export Data
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-destructive border-dashed rounded-md bg-destructive/5">
             <div>
              <h4 className="font-semibold text-destructive">Delete Account</h4>
              <p className="text-sm text-destructive/80">Permanently delete your account and all associated data. This cannot be undone.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled> {/* Re-enable when feature is ready */}
                  <Trash2 className="mr-2 h-4 w-4" /> Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All your flashcards, quiz history, and personal data will be permanently deleted.
                    This will not cancel any active subscriptions if applicable (not currently implemented).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Yes, Delete My Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
