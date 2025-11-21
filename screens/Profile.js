import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

const Profile = ({ navigation, route }) => {
  const { user } = route.params;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || 'Hey, I am using MochiTV!');

  const handleSave = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/login?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ name, bio })
      });
      
      await response.json();
      Alert.alert('Muvaffaqiyat', 'Profil yangilandi!');
      setEditing(false);
    } catch (error) {
      Alert.alert('Xato', 'Profilni yangilashda xatolik!');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Chiqish',
      'Hisobdan chiqmoqchimisiz?',
      [
        { text: 'Yo\'q', style: 'cancel' },
        { text: 'Ha', onPress: () => navigation.replace('Login') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Orqaga</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={styles.editIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>😊</Text>
          </View>
          {editing ? (
            <TextInput
              style={styles.profileNameInput}
              value={name}
              onChangeText={setName}
            />
          ) : (
            <Text style={styles.profileName}>{name}</Text>
          )}
          <Text style={styles.profilePhone}>{user.phone}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.bioSection}>
          <Text style={styles.bioLabel}>Bio</Text>
          {editing ? (
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              multiline
            />
          ) : (
            <Text style={styles.bioText}>{bio}</Text>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>🎥</Text>
            <Text style={styles.statNumber}>247</Text>
            <Text style={styles.statLabel}>Videolar</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statNumber}>1.2K</Text>
            <Text style={styles.statLabel}>Do'stlar</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>👤</Text>
            <Text style={styles.menuText}>Akkaunt sozlamalari</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>🔒</Text>
            <Text style={styles.menuText}>Maxfiylik</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Chiqish</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Saqlash</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 24,
  },
  backButton: {
    color: 'white',
    fontSize: 18,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  editIcon: {
    fontSize: 24,
  },
  profileSection: {
    alignItems: 'center',
  },
  profileAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 64,
  },
  profileName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileNameInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  profilePhone: {
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
  },
  bioSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  bioLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 8,
  },
  bioText: {
    color: '#1F2937',
    fontSize: 16,
  },
  bioInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    color: '#1F2937',
    minHeight: 60,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statIcon: {
    fontSize: 32,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 12,
  },
  menuSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    color: '#1F2937',
    fontSize: 16,
  },
  menuArrow: {
    color: '#9CA3AF',
    fontSize: 24,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    marginHorizontal: 16,
    marginVertical: 24,
    borderRadius: 12,
    paddingVertical: 16,
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default Profile;
