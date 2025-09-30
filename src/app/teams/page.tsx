'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Users, User } from 'lucide-react';
import { uploadImageToFirebase } from '@/lib/uploadImage';

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
  createdAt: Date;
  updatedAt: Date;
}

interface Team {
  id: string;
  name: string;
  logo?: string;
  color: string;
  description?: string;
  players: Player[];
  createdAt: Date;
  updatedAt: Date;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [newTeam, setNewTeam] = useState({
    name: '',
    foundedDate: '',
    logo: '',
    color: '#3B82F6'
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      console.log('Loading teams...');
      const response = await fetch('/api/teams');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const teamsData = await response.json();
        console.log('Teams data received:', teamsData);
        
        // Ensure teams data is valid
        const validTeams = Array.isArray(teamsData) ? teamsData.filter(team => 
          team && team.id && team.name
        ) : [];
        
        console.log('Valid teams:', validTeams.length);
        setTeams(validTeams);
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        toast.error('Jamoalar yuklanmadi: ' + response.status);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Jamoalar yuklanmadi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTeam.name.trim()) {
      toast.error('Jamoa nomi kiritilishi shart');
      return;
    }

    try {
      let logoUrl = newTeam.logo;
      
      // Upload logo to Firebase Storage if file is selected
      if (logoFile) {
        setUploadingLogo(true);
        const fileName = `teams/${Date.now()}-${logoFile.name}`;
        logoUrl = await uploadImageToFirebase(logoFile, fileName);
        setUploadingLogo(false);
      }

      const teamData = {
        ...newTeam,
        logo: logoUrl
      };

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      if (response.ok) {
        toast.success('Jamoa muvaffaqiyatli qo\'shildi');
        setNewTeam({ name: '', foundedDate: '', logo: '', color: '#3B82F6' });
        setLogoFile(null);
        setLogoPreview('');
        setShowAddForm(false);
        loadTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Jamoa qo\'shishda xatolik');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Jamoa qo\'shishda xatolik');
      setUploadingLogo(false);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setNewTeam({
      name: team.name,
      foundedDate: team.foundedDate || '',
      logo: team.logo || '',
      color: team.color
    });
    setLogoFile(null);
    setLogoPreview('');
    setShowAddForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTeam || !newTeam.name.trim()) {
      toast.error('Jamoa nomi kiritilishi shart');
      return;
    }

    try {
      let logoUrl = newTeam.logo;
      
      // Upload logo to Firebase Storage if file is selected
      if (logoFile) {
        setUploadingLogo(true);
        const fileName = `teams/${Date.now()}-${logoFile.name}`;
        logoUrl = await uploadImageToFirebase(logoFile, fileName);
        setUploadingLogo(false);
      }

      const teamData = {
        id: editingTeam.id,
        ...newTeam,
        logo: logoUrl
      };

      const response = await fetch('/api/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      if (response.ok) {
        toast.success('Jamoa muvaffaqiyatli yangilandi');
        setNewTeam({ name: '', foundedDate: '', logo: '', color: '#3B82F6' });
        setLogoFile(null);
        setLogoPreview('');
        setEditingTeam(null);
        setShowAddForm(false);
        loadTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Jamoa yangilashda xatolik');
      }
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Jamoa yangilashda xatolik');
      setUploadingLogo(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Bu jamoani o\'chirishni xohlaysizmi?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Jamoa muvaffaqiyatli o\'chirildi');
        loadTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Jamoa o\'chirishda xatolik');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Jamoa o\'chirishda xatolik');
    }
  };

  const handleShowDetails = (team: Team) => {
    setSelectedTeam(team);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Jamoalar</h1>
        <Button
          onClick={() => {
            setEditingTeam(null);
            setNewTeam({ name: '', foundedDate: '', logo: '', color: '#3B82F6' });
            setShowAddForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yangi Jamoa
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTeam ? 'Jamoa Tahrirlash' : 'Yangi Jamoa Qo\'shish'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingTeam ? handleUpdate : handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jamoa Nomi *
                </label>
                <Input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Jamoa nomini kiriting"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tashkil Topgan Sana *
                </label>
                <Input
                  type="date"
                  value={newTeam.foundedDate}
                  onChange={(e) => setNewTeam({ ...newTeam, foundedDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo Rasm
                </label>
                <div className="flex items-center space-x-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        setLogoPreview(URL.createObjectURL(file));
                        setNewTeam({ ...newTeam, logo: '' }); // Clear logo URL until upload
                      }
                    }}
                    className="flex-1"
                    disabled={uploadingLogo}
                  />
                  {(newTeam.logo || logoPreview) && (
                    <img
                      src={newTeam.logo || logoPreview}
                      alt="Logo preview"
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jamoa Rangi
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={newTeam.color}
                    onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    type="text"
                    value={newTeam.color}
                    onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? 'Yuklanmoqda...' : (editingTeam ? 'Yangilash' : 'Qo\'shish')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingTeam(null);
                    setNewTeam({ name: '', foundedDate: '', logo: '', color: '#3B82F6' });
                    setLogoFile(null);
                    setLogoPreview('');
                  }}
                >
                  Bekor qilish
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams && teams.length > 0 ? teams.map((team) => (
          <Card key={team.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {team.logo ? (
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <p className="text-sm text-gray-500">
                      {team.players?.length || 0} o'yinchi
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShowDetails(team)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(team)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(team.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {team.description && (
                <p className="text-sm text-gray-600 mb-2">{team.description}</p>
              )}
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: team.color }}
                ></div>
                <span className="text-sm text-gray-500">Jamoa rangi</span>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="text-center py-12 col-span-full">
            <p className="text-gray-500">Hozircha jamoalar yo'q</p>
          </div>
        )}
      </div>

      {/* Team Details Modal */}
      {showDetails && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">{selectedTeam.name} Tafsilotlari</h3>
            <div className="space-y-3">
              <div>
                <strong>Nomi:</strong> {selectedTeam.name}
              </div>
              <div>
                <strong>Tashkil Topgan Sana:</strong> {selectedTeam.foundedDate || 'Ma\'lumot yo\'q'}
              </div>
              <div>
                <strong>Rangi:</strong> 
                <div className="flex items-center space-x-2 mt-1">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: selectedTeam.color }}
                  ></div>
                  <span>{selectedTeam.color}</span>
                </div>
              </div>
              <div>
                <strong>O'yinchilar soni:</strong> {selectedTeam.players?.length || 0}
              </div>
              <div>
                <strong>Yaratilgan:</strong> {new Date(selectedTeam.createdAt).toLocaleDateString('uz-UZ')}
              </div>
              
              {/* Players List */}
              <div className="mt-4">
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  O'yinchilar ({selectedTeam.players?.length || 0})
                </h4>
                
                {selectedTeam.players && selectedTeam.players.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {selectedTeam.players.map((player) => (
                      <div key={player.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        {player.photo ? (
                          <img
                            src={player.photo}
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {player.position || 'Pozitsiya belgilanmagan'}
                          </p>
                          <p className="text-xs text-gray-400">
                            #{player.number || 'Raqam yo\'q'}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          player.status === 'active' ? 'bg-green-100 text-green-800' :
                          player.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {player.status === 'active' ? 'Faol' :
                           player.status === 'inactive' ? 'Nofaol' : 'Suspensiya'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Hozircha o'yinchilar yo'q</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={() => setShowDetails(false)}>
                Yopish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
