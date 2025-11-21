import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabaseClient';

const Login = ({ navigation }) => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const address = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          locationName: address[0]
            ? `${address[0].city || address[0].district || ''}, ${address[0].country || ''}`
            : 'Unknown location',
        });
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Xatolik', 'Iltimos, barcha maydonlarni to\'ldiring');
      return;
    }

    setLoading(true);

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !user) {
        Alert.alert('Xatolik', 'Username yoki parol noto\'g\'ri');
        return;
      }

      // Update location
      await supabase
        .from('users')
        .update({
          latitude: location?.latitude,
          longitude: location?.longitude,
          location_name: location?.locationName,
        })
        .eq('id', user.id);

      navigation.replace('Home', { user });
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Xatolik', 'Kirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!phone.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Xatolik', 'Iltimos, barcha maydonlarni to\'ldiring');
      return;
    }

    if (phone.length < 9) {
      Alert.alert('Xatolik', 'Telefon raqam noto\'g\'ri');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Xatolik', 'Parollar mos kelmadi');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Xatolik', 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    setLoading(true);

    try {
      // Check if username exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (existingUser) {
        Alert.alert('Xatolik', 'Bu username allaqachon band');
        setLoading(false);
        return;
      }

      // Create new user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([
          {
            phone,
            username,
            password,
            latitude: location?.latitude,
            longitude: location?.longitude,
            location_name: location?.locationName,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Muvaffaqiyat', 'Ro\'yxatdan o\'tdingiz!', [
        {
          text: 'OK',
          onPress: () => navigation.replace('Home', { user: newUser }),
        },
      ]);
    } catch (error) {
      console.error('Register error:', error);
      Alert.alert('Xatolik', 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="tv" size={64} color="#3B82F6" />
        </View>
        
        <Text style={styles.title}>MochiTV</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Xush kelibsiz!' : 'Ro\'yxatdan o\'ting'}
        </Text>

        {location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={20} color="#3B82F6" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationText}>{location.locationName}</Text>
              <Text style={styles.locationSubtext}>Sizning joylashuvingiz</Text>
            </View>
          </View>
        )}

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.tabActive]}
            onPress={() => setMode('login')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
              Kirish
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.tabActive]}
            onPress={() => setMode('register')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
              Ro'yxatdan o'tish
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Ionicons name="call" size={18} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Telefon raqam"
                placeholderTextColor="#6B7280"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="person" size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#6B7280"
              value={username}
              onChangeText={setUsername}
              maxLength={50}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Parol"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={50}
            />
          </View>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Ionicons name="shield-checkmark" size={18} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Parolni takrorlang"
                placeholderTextColor="#6B7280"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                maxLength={50}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isLogin ? handleLogin : handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Kirish' : 'Ro\'yxatdan o\'tish'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.infoText}>
          {isLogin
            ? 'Hisobingiz yo\'qmi? Ro\'yxatdan o\'tish tugmasini bosing'
            : 'Ro\'yxatdan o\'tish orqali siz barcha shartlarga rozilik bildirasiz'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  locationContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationSubtext: {
    color: '#6B7280',
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#262626',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  formContainer: {
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#1E40AF',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});

export default Login;  // ✅ Bu muhim qator!