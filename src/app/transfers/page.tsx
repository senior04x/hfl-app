'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Check, X, RefreshCw } from 'lucide-react';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TransferRequest {
  id: string;
  playerId: string;
  currentTeamId: string;
  currentTeamName: string;
  newTeamId: string;
  newTeamName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  teamName: string;
}

const TransfersPage = () => {
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null);

  useEffect(() => {
    let unsubscribeTransfer: (() => void) | undefined;
    let unsubscribePlayers: (() => void) | undefined;

    const setupListeners = async () => {
      unsubscribeTransfer = await fetchTransferRequests();
      unsubscribePlayers = await fetchPlayers();
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeTransfer) unsubscribeTransfer();
      if (unsubscribePlayers) unsubscribePlayers();
    };
  }, []);

  const fetchTransferRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching transfer requests from Firebase...');
      
      // Set up real-time listener for transfer requests
      const q = query(collection(db, 'transferRequests'), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests: TransferRequest[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            id: doc.id,
            playerId: data.playerId || '',
            currentTeamId: data.currentTeamId || '',
            currentTeamName: data.currentTeamName || '',
            newTeamId: data.newTeamId || '',
            newTeamName: data.newTeamName || '',
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          });
        });
        
        console.log('Transfer requests fetched:', requests);
        setTransferRequests(requests);
        setLoading(false);
      });

      // Store unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      console.log('Fetching players from Firebase...');
      
      // Set up real-time listener for players
      const q = query(collection(db, 'players'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const playersData: Player[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          playersData.push({
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            teamName: data.teamName || '',
          });
        });
        
        console.log('Players fetched:', playersData);
        setPlayers(playersData);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      console.log('Updating transfer request:', id, 'to status:', status);
      
      // Update transfer request status
      const { doc, updateDoc } = await import('firebase/firestore');
      const transferRef = doc(db, 'transferRequests', id);
      await updateDoc(transferRef, {
        status: status,
        updatedAt: new Date(),
      });
      
      // If approved, update player's team
      if (status === 'approved') {
        const transferRequest = transferRequests.find(req => req.id === id);
        if (transferRequest) {
          const playerRef = doc(db, 'players', transferRequest.playerId);
          await updateDoc(playerRef, {
            teamId: transferRequest.newTeamId,
            teamName: transferRequest.newTeamName,
            updatedAt: new Date(),
          });
          console.log('Player team updated:', transferRequest.playerId);
        }
      }
      
      console.log('Transfer request updated successfully');
      
      // Show success message
      const statusText = status === 'approved' ? 'tasdiqlandi' : 'rad etildi';
      alert(`Transfer so'rovi ${statusText}`);
    } catch (error) {
      console.error('Error updating transfer request:', error);
      alert('Xatolik yuz berdi');
    }
  };

  const getFilteredTransferRequests = () => {
    let filtered = transferRequests;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.currentTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.newTeamName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : 'Noma\'lum o\'yinchi';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Kutilmoqda';
      case 'approved': return 'Tasdiqlangan';
      case 'rejected': return 'Rad etilgan';
      default: return 'Noma\'lum';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const filteredRequests = getFilteredTransferRequests();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Transfer Arizalari</h1>
        <Button onClick={fetchTransferRequests} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yangilash
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qidirish
              </label>
              <Input
                placeholder="Jamoa nomi bo'yicha qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Holat
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Holatni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barchasi</SelectItem>
                  <SelectItem value="pending">Kutilmoqda</SelectItem>
                  <SelectItem value="approved">Tasdiqlangan</SelectItem>
                  <SelectItem value="rejected">Rad etilgan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Arizalari ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Transfer arizalari topilmadi</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg">
                          {getPlayerName(request.playerId)}
                        </h3>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusText(request.status)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Joriy jamoa:</span> {request.currentTeamName}
                        </div>
                        <div>
                          <span className="font-medium">Yangi jamoa:</span> {request.newTeamName}
                        </div>
                        <div>
                          <span className="font-medium">Yuborilgan:</span> {new Date(request.createdAt).toLocaleDateString('uz-UZ')}
                        </div>
                        <div>
                          <span className="font-medium">Yangilangan:</span> {new Date(request.updatedAt).toLocaleDateString('uz-UZ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTransfer(request)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Batafsil
                      </Button>
                      
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(request.id, 'approved')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Tasdiqlash
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(request.id, 'rejected')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rad etish
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Transfer So'rovi Tafsilotlari</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTransfer(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {getPlayerName(selectedTransfer.playerId)}
                </h3>
                <Badge className={getStatusColor(selectedTransfer.status)}>
                  {getStatusText(selectedTransfer.status)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Joriy Jamoa</h4>
                  <p className="text-lg font-semibold">{selectedTransfer.currentTeamName}</p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Yangi Jamoa</h4>
                  <p className="text-lg font-semibold text-blue-700">{selectedTransfer.newTeamName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Yuborilgan:</span> {new Date(selectedTransfer.createdAt).toLocaleString('uz-UZ')}
                </div>
                <div>
                  <span className="font-medium">Yangilangan:</span> {new Date(selectedTransfer.updatedAt).toLocaleString('uz-UZ')}
                </div>
              </div>
              
              {selectedTransfer.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      handleStatusUpdate(selectedTransfer.id, 'approved');
                      setSelectedTransfer(null);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Tasdiqlash
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleStatusUpdate(selectedTransfer.id, 'rejected');
                      setSelectedTransfer(null);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rad etish
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransfersPage;
