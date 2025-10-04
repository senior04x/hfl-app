'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Eye, RefreshCw, Calendar, Clock, Users, Bell } from 'lucide-react';
import { onSnapshot, collection, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { pushNotificationService } from '@/lib/pushNotificationService';

interface Team {
  id: string;
  name: string;
  logo?: string;
  color?: string;
}

interface Match {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  matchDate: Date;
  status: 'scheduled' | 'live' | 'finished';
  venue?: string;
  referee?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MatchesPage = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Form data for new match
  const [newMatch, setNewMatch] = useState({
    homeTeamId: '',
    awayTeamId: '',
    matchDate: '',
    venue: '',
    referee: '',
    youtubeLink: '',
  });

  // Form data for editing match
  const [editMatch, setEditMatch] = useState({
    homeScore: 0,
    awayScore: 0,
    status: 'scheduled' as 'scheduled' | 'live' | 'finished',
    venue: '',
    referee: '',
    youtubeLink: '',
  });

  useEffect(() => {
    let unsubscribeMatches: (() => void) | undefined;
    let unsubscribeTeams: (() => void) | undefined;

    const setupListeners = async () => {
      unsubscribeMatches = await fetchMatches();
      unsubscribeTeams = await fetchTeams();
    };

    setupListeners();

    return () => {
      if (unsubscribeMatches) unsubscribeMatches();
      if (unsubscribeTeams) unsubscribeTeams();
    };
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      console.log('Fetching matches from Firebase...');
      
      const q = query(collection(db, 'matches'), orderBy('matchDate', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const matchesData: Match[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          matchesData.push({
            id: doc.id,
            homeTeamId: data.homeTeamId || '',
            homeTeamName: data.homeTeamName || '',
            awayTeamId: data.awayTeamId || '',
            awayTeamName: data.awayTeamName || '',
            homeScore: data.homeScore || 0,
            awayScore: data.awayScore || 0,
            matchDate: data.matchDate?.toDate ? data.matchDate.toDate() : new Date(data.matchDate),
            status: data.status || 'scheduled',
            venue: data.venue || '',
            referee: data.referee || '',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          });
        });
        
        console.log('Matches fetched:', matchesData);
        setMatches(matchesData);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      console.log('Fetching teams from MongoDB API...');
      
      const response = await fetch('https://hfl-backend-360d7733bad1.herokuapp.com/api/teams', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('MongoDB API response:', result);
      
      if (!result.success) {
        throw new Error('API returned error');
      }
      
      const teamsData = result.data || [];
      console.log('Teams fetched from MongoDB API:', teamsData);
      setTeams(teamsData);
      
      return () => {}; // Return empty cleanup function
    } catch (error) {
      console.error('Error fetching teams from MongoDB API:', error);
    }
  };

  const handleAddMatch = async () => {
    try {
      if (!newMatch.homeTeamId || !newMatch.awayTeamId || !newMatch.matchDate) {
        alert('Barcha majburiy maydonlarni to\'ldiring');
        return;
      }

      if (newMatch.homeTeamId === newMatch.awayTeamId) {
        alert('Jamoalar bir xil bo\'lishi mumkin emas');
        return;
      }

      const homeTeam = teams.find(t => t.id === newMatch.homeTeamId);
      const awayTeam = teams.find(t => t.id === newMatch.awayTeamId);

      if (!homeTeam || !awayTeam) {
        alert('Jamoalar topilmadi');
        return;
      }

      const matchData = {
        homeTeamId: newMatch.homeTeamId,
        homeTeamName: homeTeam.name,
        awayTeamId: newMatch.awayTeamId,
        awayTeamName: awayTeam.name,
        homeScore: 0,
        awayScore: 0,
        matchDate: new Date(newMatch.matchDate),
        status: 'scheduled',
        venue: newMatch.venue,
        referee: newMatch.referee,
        youtubeLink: newMatch.youtubeLink,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Adding match:', matchData);
      await addDoc(collection(db, 'matches'), matchData);
      
      // Send push notification about new match
      try {
        const matchDate = new Date(newMatch.matchDate).toLocaleDateString('uz-UZ');
        const matchInfo = `${homeTeam.name} vs ${awayTeam.name}`;
        
        // Send to all users (in real app, get device tokens from database)
        const success = await pushNotificationService.sendAnnouncement(
          'HFL Yangi O\'yin',
          `${matchInfo} o'yini ${matchDate} sanasida bo'lib o'tadi. O'yinni qo'ldan boy bermang!`,
          'all'
        );
        
        if (success) {
          console.log('Push notification sent for new match');
        }
      } catch (notificationError) {
        console.error('Push notification error:', notificationError);
      }
      
      setNewMatch({
        homeTeamId: '',
        awayTeamId: '',
        matchDate: '',
        venue: '',
        referee: '',
        youtubeLink: '',
      });
      setShowAddDialog(false);
      
      alert('O\'yin muvaffaqiyatli qo\'shildi va push xabari yuborildi');
    } catch (error) {
      console.error('Error adding match:', error);
      alert('Xatolik yuz berdi');
    }
  };

  const handleEditMatch = async () => {
    try {
      if (!editingMatch) return;

      const matchRef = doc(db, 'matches', editingMatch.id);
      await updateDoc(matchRef, {
        homeScore: editMatch.homeScore,
        awayScore: editMatch.awayScore,
        status: editMatch.status,
        venue: editMatch.venue,
        referee: editMatch.referee,
        youtubeLink: editMatch.youtubeLink,
        updatedAt: new Date(),
      });

      setEditingMatch(null);
      setShowEditDialog(false);
      
      alert('O\'yin muvaffaqiyatli yangilandi');
    } catch (error) {
      console.error('Error updating match:', error);
      alert('Xatolik yuz berdi');
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('O\'yni o\'chirishni xohlaysizmi?')) return;

    try {
      await deleteDoc(doc(db, 'matches', matchId));
      alert('O\'yin o\'chirildi');
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Xatolik yuz berdi');
    }
  };

  const handleQuickStatusUpdate = async (matchId: string, newStatus: 'scheduled' | 'live' | 'finished') => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status: newStatus,
        updatedAt: new Date(),
      });
      console.log('Match status updated:', matchId, 'to', newStatus);
    } catch (error) {
      console.error('Error updating match status:', error);
      alert('Holatni yangilashda xatolik yuz berdi');
    }
  };

  const handleQuickScoreUpdate = async (matchId: string, homeScore: number, awayScore: number) => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        homeScore: homeScore,
        awayScore: awayScore,
        updatedAt: new Date(),
      });
      console.log('Match score updated:', matchId, homeScore, '-', awayScore);
    } catch (error) {
      console.error('Error updating match score:', error);
      alert('Hisobni yangilashda xatolik yuz berdi');
    }
  };

  const getFilteredMatches = () => {
    let filtered = matches;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(match => match.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(match => 
        match.homeTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.venue?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'finished': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Rejalashtirilgan';
      case 'live': return 'Jarayonda';
      case 'finished': return 'Tugagan';
      default: return 'Noma\'lum';
    }
  };

  const openEditDialog = (match: Match) => {
    setEditingMatch(match);
    setEditMatch({
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      venue: match.venue || '',
      referee: match.referee || '',
      youtubeLink: match.youtubeLink || '',
    });
    setShowEditDialog(true);
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

  const filteredMatches = getFilteredMatches();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">O'yinlar</h1>
        <div className="flex gap-2">
          <Button onClick={fetchMatches} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yangilash
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                O'yin qo'shish
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Yangi O'yin Qo'shish</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeTeam">Uy Jamoasi</Label>
                    <Select value={newMatch.homeTeamId} onValueChange={(value) => setNewMatch({...newMatch, homeTeamId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Uy jamoasini tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="awayTeam">Mehmon Jamoasi</Label>
                    <Select value={newMatch.awayTeamId} onValueChange={(value) => setNewMatch({...newMatch, awayTeamId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Mehmon jamoasini tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="matchDate">O'yin Sanasi</Label>
                  <Input
                    id="matchDate"
                    type="datetime-local"
                    value={newMatch.matchDate}
                    onChange={(e) => setNewMatch({...newMatch, matchDate: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="venue">Maydon</Label>
                    <Input
                      id="venue"
                      value={newMatch.venue}
                      onChange={(e) => setNewMatch({...newMatch, venue: e.target.value})}
                      placeholder="Maydon nomi"
                    />
                  </div>
                  <div>
                    <Label htmlFor="referee">Hakam</Label>
                    <Input
                      id="referee"
                      value={newMatch.referee}
                      onChange={(e) => setNewMatch({...newMatch, referee: e.target.value})}
                      placeholder="Hakam ismi"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="youtubeLink">YouTube Jonli Ko'rish Silka</Label>
                  <Input
                    id="youtubeLink"
                    value={newMatch.youtubeLink}
                    onChange={(e) => setNewMatch({...newMatch, youtubeLink: e.target.value})}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Bekor qilish
                  </Button>
                  <Button onClick={handleAddMatch}>
                    Qo'shish
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Qidirish</Label>
              <Input
                id="search"
                placeholder="Jamoa yoki maydon nomi bo'yicha qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Holat</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Holatni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barchasi</SelectItem>
                  <SelectItem value="scheduled">Rejalashtirilgan</SelectItem>
                  <SelectItem value="live">Jarayonda</SelectItem>
                  <SelectItem value="finished">Tugagan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matches List */}
      <Card>
        <CardHeader>
          <CardTitle>O'yinlar ({filteredMatches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMatches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">O'yinlar topilmadi</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match) => (
                <div key={match.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{match.homeTeamName}</span>
                          <span className="text-gray-500">vs</span>
                          <span className="font-semibold">{match.awayTeamName}</span>
                        </div>
                        <Select 
                          value={match.status} 
                          onValueChange={(value: 'scheduled' | 'live' | 'finished') => handleQuickStatusUpdate(match.id, value)}
                        >
                          <SelectTrigger className="w-32 h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Rejalashtirilgan</SelectItem>
                            <SelectItem value="live">Jarayonda</SelectItem>
                            <SelectItem value="finished">Tugagan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(match.matchDate).toLocaleDateString('uz-UZ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(match.matchDate).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Hisob:</span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={match.homeScore}
                              onChange={(e) => handleQuickScoreUpdate(match.id, parseInt(e.target.value) || 0, match.awayScore)}
                              className="w-12 h-6 text-center text-xs"
                              min="0"
                            />
                            <span>-</span>
                            <Input
                              type="number"
                              value={match.awayScore}
                              onChange={(e) => handleQuickScoreUpdate(match.id, match.homeScore, parseInt(e.target.value) || 0)}
                              className="w-12 h-6 text-center text-xs"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {(match.venue || match.referee) && (
                        <div className="mt-2 text-sm text-gray-500">
                          {match.venue && <span>Maydon: {match.venue}</span>}
                          {match.venue && match.referee && <span> • </span>}
                          {match.referee && <span>Hakam: {match.referee}</span>}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMatch(match)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ko'rish
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(match)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Tahrirlash
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMatch(match.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        O'chirish
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Match Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>O'yinni Tahrirlash</DialogTitle>
          </DialogHeader>
          {editingMatch && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <h3 className="text-lg font-semibold">
                  {editingMatch.homeTeamName} vs {editingMatch.awayTeamName}
                </h3>
                <p className="text-gray-500">
                  {new Date(editingMatch.matchDate).toLocaleDateString('uz-UZ')}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="homeScore">{editingMatch.homeTeamName} hisobi</Label>
                  <Input
                    id="homeScore"
                    type="number"
                    value={editMatch.homeScore}
                    onChange={(e) => setEditMatch({...editMatch, homeScore: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="awayScore">{editingMatch.awayTeamName} hisobi</Label>
                  <Input
                    id="awayScore"
                    type="number"
                    value={editMatch.awayScore}
                    onChange={(e) => setEditMatch({...editMatch, awayScore: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">O'yin holati</Label>
                <Select value={editMatch.status} onValueChange={(value: 'scheduled' | 'live' | 'finished') => setEditMatch({...editMatch, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Rejalashtirilgan</SelectItem>
                    <SelectItem value="live">Jarayonda</SelectItem>
                    <SelectItem value="finished">Tugagan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editVenue">Maydon</Label>
                  <Input
                    id="editVenue"
                    value={editMatch.venue}
                    onChange={(e) => setEditMatch({...editMatch, venue: e.target.value})}
                    placeholder="Maydon nomi"
                  />
                </div>
                <div>
                  <Label htmlFor="editReferee">Hakam</Label>
                  <Input
                    id="editReferee"
                    value={editMatch.referee}
                    onChange={(e) => setEditMatch({...editMatch, referee: e.target.value})}
                    placeholder="Hakam ismi"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editYoutubeLink">YouTube Jonli Ko'rish Silka</Label>
                <Input
                  id="editYoutubeLink"
                  value={editMatch.youtubeLink}
                  onChange={(e) => setEditMatch({...editMatch, youtubeLink: e.target.value})}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Bekor qilish
                </Button>
                <Button onClick={handleEditMatch}>
                  Saqlash
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">O'yin Tafsilotlari</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMatch(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center py-4 border-b">
                <h3 className="text-2xl font-bold">
                  {selectedMatch.homeTeamName} vs {selectedMatch.awayTeamName}
                </h3>
                <div className="text-3xl font-bold text-blue-600 my-2">
                  {selectedMatch.homeScore} - {selectedMatch.awayScore}
                </div>
                <Badge className={getStatusColor(selectedMatch.status)}>
                  {getStatusText(selectedMatch.status)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">O'yin Sanasi</h4>
                  <p className="text-lg">{new Date(selectedMatch.matchDate).toLocaleString('uz-UZ')}</p>
                </div>
                
                {selectedMatch.venue && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Maydon</h4>
                    <p className="text-lg">{selectedMatch.venue}</p>
                  </div>
                )}
              </div>
              
              {selectedMatch.referee && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Hakam</h4>
                  <p className="text-lg">{selectedMatch.referee}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchesPage;
