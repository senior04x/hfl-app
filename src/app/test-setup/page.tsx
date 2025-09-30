'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';

const TestSetupPage = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ [key: string]: boolean }>({});

  const createTestData = async (type: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/test-${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create test ${type}`);
      }

      const data = await response.json();
      console.log(`Test ${type} created:`, data);
      
      setResults(prev => ({ ...prev, [type]: true }));
      
    } catch (error) {
      console.error(`Error creating test ${type}:`, error);
      setResults(prev => ({ ...prev, [type]: false }));
    } finally {
      setLoading(false);
    }
  };

  const createAllTestData = async () => {
    setLoading(true);
    setResults({});
    
    // Create team first
    await createTestData('team');
    
    // Then create player
    await createTestData('player');
    
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Test Ma'lumotlari Yaratish</h1>
        <p className="text-gray-600 mt-2">
          Mobile app ni test qilish uchun test o'yinchi va jamoa yarating
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Test Jamoa</h3>
              <p className="text-sm text-gray-600 mb-3">
                Barcelona jamoasi yaratiladi
              </p>
              <Button 
                onClick={() => createTestData('team')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? 'Yaratilmoqda...' : 'Jamoa Yaratish'}
              </Button>
              {results.team !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  {results.team ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 text-sm">Yaratildi</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600 text-sm">Xatolik</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Test O'yinchi</h3>
              <p className="text-sm text-gray-600 mb-3">
                Ahmad Karimov o'yinchisi yaratiladi
              </p>
              <Button 
                onClick={() => createTestData('player')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? 'Yaratilmoqda...' : 'O\'yinchi Yaratish'}
              </Button>
              {results.player !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  {results.player ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 text-sm">Yaratildi</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600 text-sm">Xatolik</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={createAllTestData}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Barcha Ma\'lumotlar Yaratilmoqda...' : 'Barcha Test Ma\'lumotlarini Yaratish'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Telefon raqami:</strong> +998901234567</p>
            <p><strong>Parol:</strong> 123456</p>
            <p><strong>Ism:</strong> Ahmad Karimov</p>
            <p><strong>Jamoa:</strong> Barcelona</p>
            <p><strong>Pozitsiya:</strong> FWD</p>
            <p><strong>Forma raqami:</strong> 10</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestSetupPage;
