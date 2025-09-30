'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, 
  Upload, 
  X, 
  Loader2,
  Users,
  Target,
  Hash,
  Phone,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPhoneNumber, parsePhoneNumberForAPI, validatePhoneNumber } from '@/lib/phoneUtils';

interface Team {
  id: string;
  name: string;
  color: string;
  logo?: string;
}

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerAdded: () => void;
}

export function AddPlayerModal({ isOpen, onClose, onPlayerAdded }: AddPlayerModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    photo: null as File | null,
    photoPreview: '',
    teamId: '',
    position: '',
    number: '',
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    matchesPlayed: 0,
  });

  // Load teams when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Team[];
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Jamoalar yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    if (field === 'phone') {
      const formatted = formatPhoneNumber(value as string);
      setFormData(prev => ({ ...prev, [field]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ 
        ...prev, 
        photo: file,
        photoPreview: URL.createObjectURL(file)
      }));
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ 
      ...prev, 
      photo: null,
      photoPreview: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.teamId) {
      toast.error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    if (!validatePhoneNumber(formData.phone)) {
      toast.error('Telefon raqami noto\'g\'ri formatda. +998 90 123 45 67 ko\'rinishida kiriting');
      return;
    }

    try {
      setSubmitting(true);
      
      // Get selected team info
      const selectedTeam = teams.find(team => team.id === formData.teamId);
      if (!selectedTeam) {
        toast.error('Jamoa topilmadi');
        return;
      }

      // For now, we'll store the photo as base64 (in production, upload to Firebase Storage)
      let photoBase64 = '';
      if (formData.photo) {
        const reader = new FileReader();
        photoBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(formData.photo);
        });
      }

      const playerData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: parsePhoneNumberForAPI(formData.phone),
        email: formData.email.trim() || '',
        photo: photoBase64,
        teamId: formData.teamId,
        teamName: selectedTeam.name,
        position: formData.position.trim() || '',
        number: parseInt(formData.number.toString()) || 0,
        goals: parseInt(formData.goals.toString()) || 0,
        assists: parseInt(formData.assists.toString()) || 0,
        yellowCards: parseInt(formData.yellowCards.toString()) || 0,
        redCards: parseInt(formData.redCards.toString()) || 0,
        matchesPlayed: parseInt(formData.matchesPlayed.toString()) || 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to players collection
      const docRef = await addDoc(collection(db, 'players'), playerData);
      console.log('Player created:', docRef.id);
      
      toast.success('O\'yinchi muvaffaqiyatli qo\'shildi!');
      onPlayerAdded();
      onClose();
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        photo: null,
        photoPreview: '',
        teamId: '',
        position: '',
        number: '',
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        matchesPlayed: 0,
      });
      
    } catch (error) {
      console.error('Error creating player:', error);
      toast.error('O\'yinchi qo\'shishda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yangi O'yinchi Qo'shish">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Shaxsiy Ma'lumotlar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ism *
                </label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="O'yinchi ismi"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Familiya *
                </label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="O'yinchi familiyasi"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Telefon *
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+998 90 123 45 67"
                  maxLength={17}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="player@example.com"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rasm
              </label>
              {formData.photoPreview ? (
                <div className="flex items-center space-x-4">
                  <img
                    src={formData.photoPreview}
                    alt="Player preview"
                    className="w-20 h-20 object-cover rounded-full border-2 border-gray-200"
                  />
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      O'zgartirish
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removePhoto}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      O'chirish
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 mb-2">Rasm yuklash</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    Rasm tanlash
                  </Button>
                </div>
              )}
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Team and Position */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Jamoa va Pozitsiya
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jamoa *
              </label>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Jamoalar yuklanmoqda...
                </div>
              ) : (
                <select
                  value={formData.teamId}
                  onChange={(e) => handleInputChange('teamId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Jamoa tanlang</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Target className="h-4 w-4 inline mr-1" />
                  Pozitsiya
                </label>
                <Select value={formData.position} onValueChange={(value) => handleInputChange('position', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pozitsiya tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GK">Darvozabon (GK)</SelectItem>
                    <SelectItem value="CB">Markaziy himoyachi (CB)</SelectItem>
                    <SelectItem value="LB">Chap qanot himoyachisi (LB)</SelectItem>
                    <SelectItem value="RB">O'ng qanot himoyachisi (RB)</SelectItem>
                    <SelectItem value="CDM">Defensiv yarim himoyachi (CDM)</SelectItem>
                    <SelectItem value="CM">Markaziy yarim himoyachi (CM)</SelectItem>
                    <SelectItem value="CAM">Hujumkor yarim himoyachi (CAM)</SelectItem>
                    <SelectItem value="LM">Chap qanot yarim himoyachisi (LM)</SelectItem>
                    <SelectItem value="RM">O'ng qanot yarim himoyachisi (RM)</SelectItem>
                    <SelectItem value="LW">Chap qanot hujumchisi (LW)</SelectItem>
                    <SelectItem value="RW">O'ng qanot hujumchisi (RW)</SelectItem>
                    <SelectItem value="ST">Markaziy hujumchi (ST)</SelectItem>
                    <SelectItem value="CF">Soxta hujumchi (CF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="h-4 w-4 inline mr-1" />
                  Forma raqami
                </label>
                <Input
                  type="number"
                  value={formData.number}
                  onChange={(e) => handleInputChange('number', e.target.value)}
                  placeholder="10"
                  min="1"
                  max="99"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Statistikalar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gollar
                </label>
                <Input
                  type="number"
                  value={formData.goals}
                  onChange={(e) => handleInputChange('goals', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Golli uzatma
                </label>
                <Input
                  type="number"
                  value={formData.assists}
                  onChange={(e) => handleInputChange('assists', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sariq kartochka
                </label>
                <Input
                  type="number"
                  value={formData.yellowCards}
                  onChange={(e) => handleInputChange('yellowCards', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qizil kartochka
                </label>
                <Input
                  type="number"
                  value={formData.redCards}
                  onChange={(e) => handleInputChange('redCards', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                O'ynagan o'yinlar
              </label>
              <Input
                type="number"
                value={formData.matchesPlayed}
                onChange={(e) => handleInputChange('matchesPlayed', e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Bekor qilish
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Qo'shilmoqda...
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                O'yinchi qo'shish
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
