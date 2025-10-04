'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Loader2, User, Users, RefreshCw, Eye, Mail, Phone, Calendar, MapPin, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { smsService } from '@/lib/smsService';

interface PlayerApplication {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  photo?: string;
  teamId: string;
  teamName: string;
  position?: string;
  number?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface TeamApplication {
  id: string;
  teamName: string;
  foundedDate: string;
  logo?: string;
  teamColor: string;
  description?: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export default function ApplicationsPage() {
  const [playerApplications, setPlayerApplications] = useState<PlayerApplication[]>([]);
  const [teamApplications, setTeamApplications] = useState<TeamApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPlayerApp, setSelectedPlayerApp] = useState<PlayerApplication | null>(null);
  const [selectedTeamApp, setSelectedTeamApp] = useState<TeamApplication | null>(null);
  
  // Filter states
  const [playerStatusFilter, setPlayerStatusFilter] = useState<string>('all');
  const [teamStatusFilter, setTeamStatusFilter] = useState<string>('all');
  const [playerSearchTerm, setPlayerSearchTerm] = useState<string>('');
  const [teamSearchTerm, setTeamSearchTerm] = useState<string>('');

  // Filter functions
  const getFilteredPlayerApplications = () => {
    try {
      if (!playerApplications || !Array.isArray(playerApplications)) {
        console.log('Player applications is not an array:', playerApplications);
        return [];
      }
      
      const filtered = playerApplications.filter(app => {
        if (!app) return false;
        
        const matchesStatus = playerStatusFilter === 'all' || app.status === playerStatusFilter;
        const matchesSearch = playerSearchTerm === '' || 
          (app.firstName && app.firstName.toLowerCase().includes(playerSearchTerm.toLowerCase())) ||
          (app.lastName && app.lastName.toLowerCase().includes(playerSearchTerm.toLowerCase())) ||
          (app.phone && app.phone.toLowerCase().includes(playerSearchTerm.toLowerCase())) ||
          (app.teamName && app.teamName.toLowerCase().includes(playerSearchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
      });
      
      console.log('Player applications filter result:', {
        total: playerApplications.length,
        filtered: filtered.length,
        statusFilter: playerStatusFilter,
        searchTerm: playerSearchTerm
      });
      
      return filtered;
    } catch (error) {
      console.error('Error filtering player applications:', error);
      return [];
    }
  };

  const getFilteredTeamApplications = () => {
    try {
      if (!teamApplications || !Array.isArray(teamApplications)) {
        console.log('Team applications is not an array:', teamApplications);
        return [];
      }
      
      const filtered = teamApplications.filter(app => {
        if (!app) return false;
        
        const matchesStatus = teamStatusFilter === 'all' || app.status === teamStatusFilter;
        const matchesSearch = teamSearchTerm === '' || 
          (app.teamName && app.teamName.toLowerCase().includes(teamSearchTerm.toLowerCase())) ||
          (app.contactPerson && app.contactPerson.toLowerCase().includes(teamSearchTerm.toLowerCase())) ||
          (app.contactPhone && app.contactPhone.toLowerCase().includes(teamSearchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
      });
      
      console.log('Team applications filter result:', {
        total: teamApplications.length,
        filtered: filtered.length,
        statusFilter: teamStatusFilter,
        searchTerm: teamSearchTerm
      });
      
      return filtered;
    } catch (error) {
      console.error('Error filtering team applications:', error);
      return [];
    }
  };

  // Reset filters
  const resetFilters = () => {
    setPlayerStatusFilter('all');
    setTeamStatusFilter('all');
    setPlayerSearchTerm('');
    setTeamSearchTerm('');
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const playerRes = await fetch('/api/league-application');
      const teamRes = await fetch('/api/team-application');

      if (playerRes.ok) {
        const players = await playerRes.json();
        console.log('Player applications fetched:', players);
        setPlayerApplications(players);
      } else {
        toast.error("O'yinchi arizalari yuklanmadi.");
      }

      if (teamRes.ok) {
        const teams = await teamRes.json();
        console.log('Team applications fetched:', teams);
        const formattedTeams = teams.map((team: any) => ({
          ...team,
          teamName: team.teamName || team.name || 'Unknown Team',
          teamColor: team.teamColor || team.color || '#3B82F6',
        }));
        console.log('Formatted team applications:', formattedTeams);
        setTeamApplications(formattedTeams);
      } else {
        toast.error("Jamoa arizalari yuklanmadi.");
      }
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error('Arizalarni yuklashda xatolik: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Firebase listeners
  useEffect(() => {
    console.log('Setting up Firebase real-time listeners...');
    
    // Player applications listener
    const playerQuery = query(
      collection(db, 'leagueApplications'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribePlayers = onSnapshot(playerQuery, (snapshot) => {
      const players = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as PlayerApplication[];
      
      console.log('Real-time player applications update:', players.length, players);
      console.log('Player applications status breakdown:', {
        total: players.length,
        pending: players.filter(p => p.status === 'pending').length,
        approved: players.filter(p => p.status === 'approved').length,
        rejected: players.filter(p => p.status === 'rejected').length
      });
      setPlayerApplications(players);
    }, (error) => {
      console.error('Error listening to player applications:', error);
      toast.error('O\'yinchi arizalarini tinglashda xatolik');
    });

    // Team applications listener
    const teamQuery = query(
      collection(db, 'teamApplications'),
      orderBy('createdAt', 'desc')
    );
    
    // Team applications - using MongoDB API
    const fetchTeamApplicationsFromAPI = async () => {
      try {
        const response = await fetch('https://hfl-backend-360d7733bad1.herokuapp.com/api/team-applications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error('API returned error');
        }
        
        const teams = result.data || [];
        console.log('Team applications fetched from MongoDB API:', teams.length);
        setTeamApplications(teams);
      } catch (error) {
        console.error('Error fetching team applications from MongoDB API:', error);
        toast.error('Jamoa arizalarini olishda xatolik');
      }
    };
    
    // Fetch team applications initially
    fetchTeamApplicationsFromAPI();
    
    // Set up polling for real-time updates (every 30 seconds)
    const teamApplicationsInterval = setInterval(fetchTeamApplicationsFromAPI, 30000);
    
    const unsubscribeTeams = () => {
      clearInterval(teamApplicationsInterval);
    };

    setLoading(false);

    // Cleanup listeners
    return () => {
      console.log('Cleaning up Firebase listeners...');
      unsubscribePlayers();
      unsubscribeTeams();
    };
  }, []);

  const handlePlayerApplicationAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/league-application`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: action === 'approve' ? 'approved' : 'rejected' }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Send SMS notification
        const application = playerApplications.find(app => app.id === id);
        if (application) {
          try {
            const smsSent = action === 'approve' 
              ? await smsService.sendApplicationApprovalSMS(
                  application.phone, 
                  `${application.firstName} ${application.lastName}`, 
                  'player'
                )
              : await smsService.sendApplicationRejectionSMS(
                  application.phone, 
                  `${application.firstName} ${application.lastName}`, 
                  'player'
                );
            
            if (smsSent) {
              toast.success(`SMS xabari yuborildi: ${application.phone}`);
            } else {
              toast.warning('Ariza ${action === "approve" ? "tasdiqlandi" : "rad etildi"}, lekin SMS yuborilmadi');
            }
          } catch (smsError) {
            console.error('SMS send error:', smsError);
            toast.warning('Ariza ${action === "approve" ? "tasdiqlandi" : "rad etildi"}, lekin SMS yuborilmadi');
          }
        }
        
        if (action === 'approve' && result.playerId) {
          toast.success(`O'yinchi arizasi tasdiqlandi va o'yinchilar ro'yxatiga qo'shildi!`);
        } else {
          toast.success(`O'yinchi arizasi ${action === 'approve' ? 'tasdiqlandi' : 'rad etildi'}.`);
        }
        // Real-time listener handles refresh automatically
      } else {
        const errorData = await response.json();
        toast.error(`Xatolik: ${errorData.error || 'Amal bajarilmadi'}`);
      }
    } catch (error: any) {
      console.error(`Error ${action} player application:`, error);
      toast.error(`Amal bajarishda xatolik: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleTeamApplicationAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/team-application`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: action === 'approve' ? 'approved' : 'rejected' }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Send SMS notification
        const application = teamApplications.find(app => app.id === id);
        if (application) {
          try {
            const smsSent = action === 'approve' 
              ? await smsService.sendApplicationApprovalSMS(
                  application.contactPhone, 
                  application.contactPerson, 
                  'team'
                )
              : await smsService.sendApplicationRejectionSMS(
                  application.contactPhone, 
                  application.contactPerson, 
                  'team'
                );
            
            if (smsSent) {
              toast.success(`SMS xabari yuborildi: ${application.contactPhone}`);
            } else {
              toast.warning('Ariza ${action === "approve" ? "tasdiqlandi" : "rad etildi"}, lekin SMS yuborilmadi');
            }
          } catch (smsError) {
            console.error('SMS send error:', smsError);
            toast.warning('Ariza ${action === "approve" ? "tasdiqlandi" : "rad etildi"}, lekin SMS yuborilmadi');
          }
        }
        
        if (action === 'approve' && result.teamId) {
          toast.success(`Jamoa arizasi tasdiqlandi va jamoalar ro'yxatiga qo'shildi!`);
        } else {
          toast.success(`Jamoa arizasi ${action === 'approve' ? 'tasdiqlandi' : 'rad etildi'}.`);
        }
        // Real-time listener handles refresh automatically
      } else {
        const errorData = await response.json();
        toast.error(`Xatolik: ${errorData.error || 'Amal bajarilmadi'}`);
      }
    } catch (error: any) {
      console.error(`Error ${action} team application:`, error);
      toast.error(`Amal bajarishda xatolik: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-60px)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg text-gray-600">Arizalar yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Arizalar</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Filterni tozalash
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApplications}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </Button>
        </div>
      </div>
      <p className="text-gray-600">Kelgan o'yinchi va jamoa arizalarini boshqaring. Ma'lumotlar avtomatik yangilanadi.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              O'yinchi Arizalari ({getFilteredPlayerApplications().length})
            </CardTitle>
            
            {/* Player Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="O'yinchi qidirish (ism, telefon, jamoa)..."
                  value={playerSearchTerm}
                  onChange={(e) => setPlayerSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={playerStatusFilter} onValueChange={setPlayerStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status tanlang" />
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
          </CardHeader>
          <CardContent>
            {getFilteredPlayerApplications().length === 0 ? (
              <p className="text-gray-500">
                {playerApplications.length === 0 
                  ? "Hozircha o'yinchi arizalari yo'q." 
                  : "Qidiruv natijalari topilmadi."
                }
              </p>
            ) : (
              <div className="space-y-4">
                {getFilteredPlayerApplications().map((app) => (
                  <div key={app.id} className="border p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {app.photo ? (
                          <img 
                            src={app.photo} 
                            alt="Player Photo" 
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{app.firstName} {app.lastName}</p>
                          <p className="text-sm text-gray-600">{app.teamName} jamoasiga</p>
                          <p className="text-sm text-gray-500">{app.phone}</p>
                          {app.email && (
                            <p className="text-sm text-gray-500">{app.email}</p>
                          )}
                          {app.position && (
                            <p className="text-sm text-gray-500">Pozitsiya: {app.position}</p>
                          )}
                          {app.number && (
                            <p className="text-sm text-gray-500">Forma raqami: {app.number}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {new Date(app.createdAt).toLocaleDateString('uz-UZ')}
                          </p>
                          <p className={`text-xs font-medium ${
                            app.status === 'pending' ? 'text-yellow-600' :
                            app.status === 'approved' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Status: {app.status === 'pending' ? 'Kutilmoqda' : app.status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPlayerApp(app)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-1">Batafsil</span>
                        </Button>
                        {app.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlayerApplicationAction(app.id, 'approve')}
                              disabled={processingId === app.id}
                              className="text-green-600 hover:text-green-700"
                            >
                              {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              <span className="ml-1">Tasdiqlash</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handlePlayerApplicationAction(app.id, 'reject')}
                              disabled={processingId === app.id}
                            >
                              {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                              <span className="ml-1">Rad etish</span>
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

        {/* Team Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Jamoa Arizalari ({getFilteredTeamApplications().length})
            </CardTitle>
            
            {/* Team Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Jamoa qidirish (nomi, aloqa shaxsi, telefon)..."
                  value={teamSearchTerm}
                  onChange={(e) => setTeamSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={teamStatusFilter} onValueChange={setTeamStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status tanlang" />
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
          </CardHeader>
          <CardContent>
            {getFilteredTeamApplications().length === 0 ? (
              <p className="text-gray-500">
                {teamApplications.length === 0 
                  ? "Hozircha jamoa arizalari yo'q." 
                  : "Qidiruv natijalari topilmadi."
                }
              </p>
            ) : (
              <div className="space-y-4">
                {getFilteredTeamApplications().map((app) => (
                  <div key={app.id} className="border p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {app.logo ? (
                          <img 
                            src={app.logo} 
                            alt="Team Logo" 
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200" 
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: app.teamColor }}
                          >
                            {app.teamName?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-lg">{app.teamName}</p>
                          <p className="text-sm text-gray-600">Tashkil topgan: {app.foundedDate}</p>
                          <p className="text-sm text-gray-500">Aloqa: {app.contactPerson} ({app.contactPhone})</p>
                          {app.description && (
                            <p className="text-sm text-gray-500">{app.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {new Date(app.createdAt).toLocaleDateString('uz-UZ')}
                          </p>
                          <p className={`text-xs font-medium ${
                            app.status === 'pending' ? 'text-yellow-600' :
                            app.status === 'approved' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Status: {app.status === 'pending' ? 'Kutilmoqda' : app.status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTeamApp(app)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-1">Batafsil</span>
                        </Button>
                        {app.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTeamApplicationAction(app.id, 'approve')}
                              disabled={processingId === app.id}
                              className="text-green-600 hover:text-green-700"
                            >
                              {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              <span className="ml-1">Tasdiqlash</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleTeamApplicationAction(app.id, 'reject')}
                              disabled={processingId === app.id}
                            >
                              {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                              <span className="ml-1">Rad etish</span>
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
      </div>

      {/* Player Application Detail Modal */}
      {selectedPlayerApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">O'yinchi Arizasi</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlayerApp(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Player Photo and Basic Info */}
                <div className="flex items-start space-x-4">
                  {selectedPlayerApp.photo ? (
                    <img 
                      src={selectedPlayerApp.photo} 
                      alt="Player Photo" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" 
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-10 w-10 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedPlayerApp.firstName} {selectedPlayerApp.lastName}
                    </h3>
                    <p className="text-lg text-gray-600">{selectedPlayerApp.teamName} jamoasiga</p>
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      selectedPlayerApp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedPlayerApp.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedPlayerApp.status === 'pending' ? 'Kutilmoqda' : 
                       selectedPlayerApp.status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      <p className="font-medium">{selectedPlayerApp.phone}</p>
                    </div>
                  </div>
                  {selectedPlayerApp.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedPlayerApp.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Football Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPlayerApp.position && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Pozitsiya</p>
                        <p className="font-medium">{selectedPlayerApp.position}</p>
                      </div>
                    </div>
                  )}
                  {selectedPlayerApp.number && (
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Forma raqami</p>
                        <p className="font-medium">#{selectedPlayerApp.number}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Application Date */}
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Ariza sanasi</p>
                    <p className="font-medium">
                      {new Date(selectedPlayerApp.createdAt).toLocaleDateString('uz-UZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedPlayerApp.status === 'pending' && (
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button
                      onClick={() => {
                        handlePlayerApplicationAction(selectedPlayerApp.id, 'approve');
                        setSelectedPlayerApp(null);
                      }}
                      disabled={processingId === selectedPlayerApp.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processingId === selectedPlayerApp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Tasdiqlash
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handlePlayerApplicationAction(selectedPlayerApp.id, 'reject');
                        setSelectedPlayerApp(null);
                      }}
                      disabled={processingId === selectedPlayerApp.id}
                      className="flex-1"
                    >
                      {processingId === selectedPlayerApp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Rad etish
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Application Detail Modal */}
      {selectedTeamApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Jamoa Arizasi</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTeamApp(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Team Logo and Basic Info */}
                <div className="flex items-start space-x-4">
                  {selectedTeamApp.logo ? (
                    <img 
                      src={selectedTeamApp.logo} 
                      alt="Team Logo" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" 
                    />
                  ) : (
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                      style={{ backgroundColor: selectedTeamApp.teamColor }}
                    >
                      {selectedTeamApp.teamName?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedTeamApp.teamName}
                    </h3>
                    <p className="text-lg text-gray-600">Yangi jamoa arizasi</p>
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      selectedTeamApp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedTeamApp.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedTeamApp.status === 'pending' ? 'Kutilmoqda' : 
                       selectedTeamApp.status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
                    </div>
                  </div>
                </div>

                {/* Team Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Tashkil topgan</p>
                      <p className="font-medium">{selectedTeamApp.foundedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Jamoa rangi</p>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: selectedTeamApp.teamColor }}
                        ></div>
                        <span className="font-medium">{selectedTeamApp.teamColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Aloqa ma'lumotlari</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Aloqa shaxsi</p>
                        <p className="font-medium">{selectedTeamApp.contactPerson}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Telefon</p>
                        <p className="font-medium">{selectedTeamApp.contactPhone}</p>
                      </div>
                    </div>
                    {selectedTeamApp.contactEmail && (
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{selectedTeamApp.contactEmail}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedTeamApp.description && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Tavsif</h4>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {selectedTeamApp.description}
                    </p>
                  </div>
                )}

                {/* Application Date */}
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Ariza sanasi</p>
                    <p className="font-medium">
                      {new Date(selectedTeamApp.createdAt).toLocaleDateString('uz-UZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedTeamApp.status === 'pending' && (
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button
                      onClick={() => {
                        handleTeamApplicationAction(selectedTeamApp.id, 'approve');
                        setSelectedTeamApp(null);
                      }}
                      disabled={processingId === selectedTeamApp.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processingId === selectedTeamApp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Tasdiqlash
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleTeamApplicationAction(selectedTeamApp.id, 'reject');
                        setSelectedTeamApp(null);
                      }}
                      disabled={processingId === selectedTeamApp.id}
                      className="flex-1"
                    >
                      {processingId === selectedTeamApp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Rad etish
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
