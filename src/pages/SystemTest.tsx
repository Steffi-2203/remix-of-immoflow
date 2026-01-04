import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { CheckCircle2, XCircle, Loader2, Play } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

export default function SystemTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    const results: TestResult[] = [];

    // Test 1: Supabase Connection
    try {
      const { data, error } = await supabase.from('organizations').select('id', { count: 'exact', head: true });
      results.push({
        test: 'Supabase Connection',
        status: error ? 'FAIL' : 'PASS',
        message: error ? error.message : 'Verbindung erfolgreich'
      });
    } catch (e: any) {
      results.push({ test: 'Supabase Connection', status: 'FAIL', message: e.message });
    }

    // Test 2: User Authentication
    let currentUser: any = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser = user;
      results.push({
        test: 'User Authentication',
        status: user ? 'PASS' : 'FAIL',
        message: user ? `User: ${user.email}` : 'Nicht eingeloggt'
      });
    } catch (e: any) {
      results.push({ test: 'User Authentication', status: 'FAIL', message: e.message });
    }

    // Test 3: User Profile & Organization
    let organizationId: string | null = null;
    if (currentUser) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', currentUser.id)
          .single();
        
        if (profileError) {
          results.push({
            test: 'User Profile',
            status: 'FAIL',
            message: profileError.message
          });
        } else {
          organizationId = profile?.organization_id;
          results.push({
            test: 'User Profile',
            status: profile?.organization_id ? 'PASS' : 'FAIL',
            message: profile?.organization_id ? 'Organization ID gefunden' : 'Keine Organization'
          });
        }

        if (organizationId) {
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', organizationId)
            .single();
          
          results.push({
            test: 'Organization Data',
            status: org ? 'PASS' : 'FAIL',
            message: org ? `Tier: ${org.subscription_tier}, Status: ${org.subscription_status}` : (orgError?.message || 'Keine Daten')
          });
        }
      } catch (e: any) {
        results.push({ test: 'Organization Check', status: 'FAIL', message: e.message });
      }
    }

    // Test 4: Properties Query
    try {
      const { data: properties, error, count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true });
      
      results.push({
        test: 'Properties Query',
        status: error ? 'FAIL' : 'PASS',
        message: error ? error.message : `${count || 0} Liegenschaften`
      });
    } catch (e: any) {
      results.push({ test: 'Properties Query', status: 'FAIL', message: e.message });
    }

    // Test 5: Units Query
    try {
      const { data: units, error, count } = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true });
      
      results.push({
        test: 'Units Query',
        status: error ? 'FAIL' : 'PASS',
        message: error ? error.message : `${count || 0} Einheiten`
      });
    } catch (e: any) {
      results.push({ test: 'Units Query', status: 'FAIL', message: e.message });
    }

    // Test 6: Tenants Query
    try {
      const { data: tenants, error, count } = await supabase
        .from('tenants')
        .select('id', { count: 'exact', head: true });
      
      results.push({
        test: 'Tenants Query',
        status: error ? 'FAIL' : 'PASS',
        message: error ? error.message : `${count || 0} Mieter`
      });
    } catch (e: any) {
      results.push({ test: 'Tenants Query', status: 'FAIL', message: e.message });
    }

    // Test 7: Stripe Configuration
    const stripeConfigured = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    results.push({
      test: 'Stripe Configuration',
      status: stripeConfigured ? 'PASS' : 'FAIL',
      message: stripeConfigured ? 'Stripe Key vorhanden' : 'Stripe Key fehlt'
    });

    // Test 8: RLS Insert/Delete Permission
    try {
      // Try to create a test property
      const testProperty = {
        name: '[TEST] Automatischer Systemtest',
        address: 'Test Straße 1',
        city: 'Wien',
        postal_code: '1010',
      };

      const { data: created, error: insertError } = await supabase
        .from('properties')
        .insert(testProperty)
        .select()
        .single();

      if (created) {
        // Create property_manager entry for the user
        if (currentUser) {
          await supabase
            .from('property_managers')
            .insert({ property_id: created.id, user_id: currentUser.id });
        }
        
        // Delete test data
        await supabase.from('property_managers').delete().eq('property_id', created.id);
        await supabase.from('properties').delete().eq('id', created.id);
        
        results.push({
          test: 'RLS Insert Permission',
          status: 'PASS',
          message: 'Insert & Delete erfolgreich'
        });
      } else {
        results.push({
          test: 'RLS Insert Permission',
          status: 'FAIL',
          message: insertError?.message || 'Insert fehlgeschlagen'
        });
      }
    } catch (e: any) {
      results.push({ test: 'RLS Insert Permission', status: 'FAIL', message: e.message });
    }

    // Test 9: Edge Functions
    try {
      const { data, error } = await supabase.functions.invoke('check-trial-expiration', {
        body: { dryRun: true }
      });
      
      results.push({
        test: 'Edge Functions',
        status: error ? 'FAIL' : 'PASS',
        message: error ? error.message : 'Edge Function erreichbar'
      });
    } catch (e: any) {
      results.push({ test: 'Edge Functions', status: 'FAIL', message: e.message });
    }

    // Test 10: Admin Role Check
    try {
      const { data: adminRole, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser?.id || '')
        .eq('role', 'admin')
        .maybeSingle();
      
      results.push({
        test: 'Admin Role',
        status: adminRole ? 'PASS' : 'FAIL',
        message: adminRole ? 'Admin-Rolle vorhanden' : 'Keine Admin-Rolle'
      });
    } catch (e: any) {
      results.push({ test: 'Admin Role', status: 'FAIL', message: e.message });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const failedTests = testResults.filter(r => r.status === 'FAIL').length;
  const allPassed = testResults.length > 0 && failedTests === 0;

  return (
    <MainLayout title="System Test" subtitle="Admin-Bereich">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Test</h1>
            <p className="text-muted-foreground">Überprüfen Sie die Systemkonfiguration und Verbindungen</p>
          </div>
          <Button onClick={runTests} disabled={isRunning} size="lg">
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tests laufen...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Tests starten
              </>
            )}
          </Button>
        </div>

        {testResults.length > 0 && (
          <Card className={allPassed ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                {allPassed ? (
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-600" />
                )}
                <div>
                  <h2 className="text-xl font-bold">
                    {allPassed ? 'Alle Tests bestanden!' : 'Einige Tests fehlgeschlagen'}
                  </h2>
                  <p className="text-muted-foreground">
                    {passedTests} / {testResults.length} Tests erfolgreich
                    {failedTests > 0 && ` • ${failedTests} fehlgeschlagen`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          {testResults.map((result, idx) => (
            <Card key={idx} className={result.status === 'PASS' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}>
              <CardContent className="py-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {result.status === 'PASS' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <h3 className="font-semibold">{result.test}</h3>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  <Badge variant={result.status === 'PASS' ? 'default' : 'destructive'}>
                    {result.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {testResults.length === 0 && !isRunning && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Klicken Sie auf "Tests starten" um die Systemkonfiguration zu überprüfen
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
