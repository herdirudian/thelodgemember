import { useState, useEffect } from 'react';

interface RegistrationCode {
  id: string;
  code: string;
  isActive: boolean;
  expiresAt: string | null;
  quota: number | null;
  usedCount: number;
  createdAt: string;
  createdBy: string;
}

export default function AdminRegistrationCodes() {
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [quota, setQuota] = useState('');

    useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/registration-codes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load codes');
      const data = await res.json();
      setCodes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load codes');
    }
  }

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const payload: any = {};
      if (newCode.trim()) payload.code = newCode.trim();
      if (expiresAt) payload.expiresAt = expiresAt;
      if (quota.trim()) payload.quota = parseInt(quota.trim());
      
      const res = await fetch(`/api/admin/registration-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to create code');
      
      setNewCode('');
      setExpiresAt('');
      setQuota('');
      setShowForm(false);
      await loadCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to create code');
    } finally {
      setLoading(false);
    }
  }

  async function toggleCodeStatus(id: string, isActive: boolean) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/registration-codes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !isActive })
      });
      
      if (!res.ok) throw new Error('Failed to update code');
      await loadCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to update code');
    }
  }

  async function deleteCode(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus kode ini?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/registration-codes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to delete code');
      await loadCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to delete code');
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Registration Codes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#0F4D39] text-white px-4 py-2 rounded-lg hover:bg-[#0c3e2d] transition"
        >
          {showForm ? 'Cancel' : 'Create New Code'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Create New Registration Code</h3>
          <form onSubmit={createCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code (leave empty for auto-generated)
              </label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39]"
                placeholder="e.g., CODE-ABC123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expires At (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quota (optional - leave empty for unlimited)
              </label>
              <input
                type="number"
                min="1"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39]"
                placeholder="e.g., 10"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#0F4D39] text-white px-4 py-2 rounded-lg hover:bg-[#0c3e2d] transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Code'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {codes.map((code) => (
              <tr key={code.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {code.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    code.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {code.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {code.quota !== null 
                    ? `${code.usedCount}/${code.quota}` 
                    : `${code.usedCount}/∞`
                  }
                  {code.quota !== null && code.usedCount >= code.quota && (
                    <span className="ml-2 text-xs text-red-600 font-medium">
                      (Quota Habis)
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {code.expiresAt 
                    ? new Date(code.expiresAt).toLocaleString('id-ID')
                    : 'Never'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {code.createdAt ? new Date(code.createdAt).toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => toggleCodeStatus(code.id, code.isActive)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      code.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {code.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteCode(code.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {codes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No registration codes found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}