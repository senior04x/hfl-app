'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Moon, 
  Sun, 
  Globe, 
  User, 
  Shield, 
  Smartphone, 
  Monitor,
  Save,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdminSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'uz' | 'en' | 'ru';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  admin: {
    username: string;
    email: string;
    fullName: string;
    role: string;
    lastLogin: string;
    deviceInfo: string;
  };
  security: {
    twoFactor: boolean;
    sessionTimeout: number;
    passwordExpiry: number;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({
    theme: 'system',
    language: 'uz',
    notifications: {
      email: true,
      push: true,
      sms: true,
    },
    admin: {
      username: 'admin',
      email: 'admin@hfl.uz',
      fullName: 'HFL Administrator',
      role: 'Super Admin',
      lastLogin: new Date().toISOString(),
      deviceInfo: 'Windows 10, Chrome 120.0',
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('admin-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      // Save to localStorage (in real app, save to API)
      localStorage.setItem('admin-settings', JSON.stringify(settings));
      
      // Apply theme
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      toast.success('Sozlamalar saqlandi!');
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Parollar mos kelmaydi');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Parol kamida 8 ta belgi bo\'lishi kerak');
      return;
    }
    
    try {
      setLoading(true);
      // In real app, send to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Parol muvaffaqiyatli o\'zgartirildi!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Parol o\'zgartirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    
    return `${platform}, ${userAgent.includes('Chrome') ? 'Chrome' : 'Browser'}, ${language}`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Sozlamalar</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Ko'rinish Sozlamalari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="theme">Mavzu</Label>
              <Select 
                value={settings.theme} 
                onValueChange={(value: 'light' | 'dark' | 'system') => 
                  setSettings({...settings, theme: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Yoruq
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Qorong'u
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Tizim
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="language">Til</Label>
              <Select 
                value={settings.language} 
                onValueChange={(value: 'uz' | 'en' | 'ru') => 
                  setSettings({...settings, language: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uz">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      O'zbek
                    </div>
                  </SelectItem>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      English
                    </div>
                  </SelectItem>
                  <SelectItem value="ru">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Русский
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Xabarnoma Sozlamalari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email xabarnomalar</Label>
                <p className="text-sm text-gray-500">Ariza holati haqida email</p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.notifications.email}
                onCheckedChange={(checked) => 
                  setSettings({
                    ...settings, 
                    notifications: {...settings.notifications, email: checked}
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">Push xabarnomalar</Label>
                <p className="text-sm text-gray-500">O'yin sanasi haqida push</p>
              </div>
              <Switch
                id="push-notifications"
                checked={settings.notifications.push}
                onCheckedChange={(checked) => 
                  setSettings({
                    ...settings, 
                    notifications: {...settings.notifications, push: checked}
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-notifications">SMS xabarnomalar</Label>
                <p className="text-sm text-gray-500">Ariza tasdiqlash SMS</p>
              </div>
              <Switch
                id="sms-notifications"
                checked={settings.notifications.sms}
                onCheckedChange={(checked) => 
                  setSettings({
                    ...settings, 
                    notifications: {...settings.notifications, sms: checked}
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Admin Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Admin Ma'lumotlari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Foydalanuvchi nomi</Label>
              <Input value={settings.admin.username} disabled />
            </div>
            
            <div>
              <Label>Email</Label>
              <Input value={settings.admin.email} disabled />
            </div>
            
            <div>
              <Label>To'liq ism</Label>
              <Input 
                value={settings.admin.fullName}
                onChange={(e) => 
                  setSettings({
                    ...settings, 
                    admin: {...settings.admin, fullName: e.target.value}
                  })
                }
              />
            </div>
            
            <div>
              <Label>Rol</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{settings.admin.role}</Badge>
              </div>
            </div>
            
            <div>
              <Label>Oxirgi kirish</Label>
              <Input value={new Date(settings.admin.lastLogin).toLocaleString('uz-UZ')} disabled />
            </div>
            
            <div>
              <Label>Qurulma ma'lumoti</Label>
              <Input value={getDeviceInfo()} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Xavfsizlik Sozlamalari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="two-factor">Ikki bosqichli autentifikatsiya</Label>
                <p className="text-sm text-gray-500">Qo'shimcha xavfsizlik</p>
              </div>
              <Switch
                id="two-factor"
                checked={settings.security.twoFactor}
                onCheckedChange={(checked) => 
                  setSettings({
                    ...settings, 
                    security: {...settings.security, twoFactor: checked}
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="session-timeout">Sessiya muddati (daqiqa)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => 
                  setSettings({
                    ...settings, 
                    security: {...settings.security, sessionTimeout: parseInt(e.target.value)}
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="password-expiry">Parol muddati (kun)</Label>
              <Input
                id="password-expiry"
                type="number"
                value={settings.security.passwordExpiry}
                onChange={(e) => 
                  setSettings({
                    ...settings, 
                    security: {...settings.security, passwordExpiry: parseInt(e.target.value)}
                  })
                }
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Parol o'zgartirish</Label>
              
              <div>
                <Label htmlFor="current-password">Joriy parol</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Joriy parolni kiriting"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="new-password">Yangi parol</Label>
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yangi parolni kiriting"
                />
              </div>

              <div>
                <Label htmlFor="confirm-password">Parolni tasdiqlash</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Parolni qayta kiriting"
                />
              </div>

              <Button 
                onClick={handlePasswordChange}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                Parolni o'zgartirish
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Sozlamalarni saqlash
        </Button>
      </div>
    </div>
  );
}
