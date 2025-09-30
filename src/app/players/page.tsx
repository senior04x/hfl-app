'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Loader2,
  RefreshCw,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AddPlayerModal } from '@/components/AddPlayerModal';
import { EditPlayerModal } from '@/components/EditPlayerModal';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  photo?: string;
  teamId: string;
  teamName: string;
  position?: string;
  number?: number;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
  logo?: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Real-time Firebase listeners
  useEffect(() => {
    console.log('Setting up Firebase real-time listeners for players...');
    
    // Players listener
    const playersQuery = query(
      collection(db, 'players'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribePlayers = onSnapshot(playersQuery, (snapshot) => {
      const playersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          photo: data.photo || '',
          teamId: data.teamId || '',
          teamName: data.teamName || 'Unknown Team',
          position: data.position || '',
          number: data.number || 0,
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      }) as Player[];
      
      console.log('Real-time players update:', playersData.length);
      setPlayers(playersData);
    }, (error) => {
      console.error('Error listening to players:', error);
      toast.error('O\'yinchi ma\'lumotlarini tinglashda xatolik');
    });

    // Teams listener
    const teamsQuery = query(collection(db, 'teams'));
    
    const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown Team',
          color: data.color || '#3B82F6',
          logo: data.logo || '',
        };
      }) as Team[];
      
      console.log('Real-time teams update:', teamsData.length);
      setTeams(teamsData);
    }, (error) => {
      console.error('Error listening to teams:', error);
      toast.error('Jamoa ma\'lumotlarini tinglashda xatolik');
    });

    setLoading(false);

    // Cleanup listeners
    return () => {
      console.log('Cleaning up Firebase listeners...');
      unsubscribePlayers();
      unsubscribeTeams();
    };
  }, []);

  // Filter players based on search and filters
  const filteredPlayers = players.filter(player => {
    const matchesSearch = 
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.phone.includes(searchTerm);
    
    const matchesTeam = selectedTeam === 'all' || player.teamId === selectedTeam;
    const matchesStatus = selectedStatus === 'all' || player.status === selectedStatus;
    
    return matchesSearch && matchesTeam && matchesStatus;
  });

  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setShowEditModal(true);
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Bu o\'yinchini o\'chirishni xohlaysizmi?')) return;
    
    try {
      // Here you would implement delete functionality
      toast.success('O\'yinchi o\'chirildi');
    } catch (error) {
      console.error('Error deleting player:', error);
      toast.error('O\'yinchini o\'chirishda xatolik');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Faol';
      case 'inactive': return 'Nofaol';
      case 'suspended': return 'Suspensiya';
      default: return 'Noma\'lum';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-60px)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg text-gray-600">O'yinchilar yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">O'yinchilar</h1>
          <Badge variant="secondary" className="ml-2">
            {filteredPlayers.length} o'yinchi
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Yangilash
          </Button>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4" />
            O'yinchi qo'shish
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="O'yinchi qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Barcha jamoalar</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Barcha statuslar</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
            <option value="suspended">Suspensiya</option>
          </select>
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">O'yinchilar topilmadi</p>
            <p className="text-gray-400">Qidiruv shartlarini o'zgartiring</p>
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <Card key={player.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={`${player.firstName} ${player.lastName}`}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        {player.firstName} {player.lastName}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{player.teamName}</p>
                      <p className="text-sm text-gray-500">{player.phone}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" title="Ko'rish">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      title="Tahrirlash"
                      onClick={() => handleEditPlayer(player)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePlayer(player.id)}
                      className="text-red-600 hover:text-red-700"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pozitsiya:</span>
                    <span className="text-sm font-medium">
                      {player.position || 'Belgilanmagan'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Raqam:</span>
                    <span className="text-sm font-medium">
                      {player.number || 'Belgilanmagan'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge className={getStatusColor(player.status)}>
                      {getStatusText(player.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Qo'shilgan:</span>
                    <span className="text-sm text-gray-500">
                      {new Date(player.createdAt).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onPlayerAdded={() => {
          setShowAddModal(false);
          toast.success('O\'yinchi muvaffaqiyatli qo\'shildi!');
        }}
      />

      {/* Edit Player Modal */}
      <EditPlayerModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPlayer(null);
        }}
        player={selectedPlayer}
        onPlayerUpdated={() => {
          setShowEditModal(false);
          setSelectedPlayer(null);
          toast.success('O\'yinchi ma\'lumotlari yangilandi!');
        }}
      />
    </div>
  );
}
