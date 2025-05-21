// src/app/(app)/activities/create/page.tsx
import { ActivityForm } from '@/components/activities/ActivityForm';
import { Card, CardContent } from '@/components/ui/card';

export default function CreateActivityPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-2xl">
       <h1 className="text-3xl font-bold mb-6">Schedule a New Activity</h1>
       <Card>
            {/* <CardHeader>
                 <CardTitle>New Activity Details</CardTitle>
                 <CardDescription>Fill in the details below to create your activity.</CardDescription>
            </CardHeader> */}
            <CardContent className="pt-6">
                <ActivityForm />
            </CardContent>
       </Card>

    </div>
  );
}
