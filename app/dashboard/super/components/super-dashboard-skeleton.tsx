import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SuperDashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Skeleton para el selector de oficinas */}
            <div className="flex items-center justify-end mb-4">
                <Skeleton className="h-10 w-64" />
            </div>

            {/* Skeleton para los tabs */}
            <Tabs defaultValue="transactions">
                <TabsList className="mb-4">
                    <Skeleton className="h-10 w-[120px] mx-1" />
                    <Skeleton className="h-10 w-[120px] mx-1" />
                    <Skeleton className="h-10 w-[120px] mx-1" />
                    <Skeleton className="h-10 w-[120px] mx-1" />
                </TabsList>

                <TabsContent value="transactions">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-6 w-64" />
                                <Skeleton className="h-9 w-36" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between mb-4">
                                    <Skeleton className="h-10 w-48" />
                                    <Skeleton className="h-10 w-48" />
                                    <Skeleton className="h-10 w-48" />
                                </div>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
} 