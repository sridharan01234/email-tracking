// app/analytics/page.tsx
'use client';
import { useState } from 'react';

export default function AnalyticsPage() {
  const [email, setEmail] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/analytics?email=${encodeURIComponent(email)}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Email Analytics</h1>
      
      <div className="mb-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
          className="p-2 border rounded mr-2"
        />
        <button
          onClick={fetchAnalytics}
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Check Analytics'}
        </button>
      </div>

      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      {analytics && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Analytics for {analytics.email}</h2>
          
          <div className="grid gap-4">
            <div>
              <h3 className="font-semibold">Metrics:</h3>
              <pre className="bg-gray-100 p-2 rounded">
                {JSON.stringify(analytics.metrics, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold">Attributes:</h3>
              <pre className="bg-gray-100 p-2 rounded">
                {JSON.stringify(analytics.attributes, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold">Last Updated:</h3>
              <p>{new Date(analytics.lastUpdated).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
