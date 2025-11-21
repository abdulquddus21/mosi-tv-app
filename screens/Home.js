import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabaseClient';

const Home = ({ navigation, route }) => {
  const { user } = route.params;
  const [carouselData, setCarouselData] = useState([]);
  const [animeCards, setAnimeCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [allViews, setAllViews] = useState({});
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    loadUserFavorites();
    
    // Real-time updates
    const animeSubscription = supabase
      .channel('anime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anime_cards' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anime_carousel' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      animeSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (carouselData.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % carouselData.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [carouselData]);

  const loadUserFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('anime_id')
        .eq('user_id', user.id);

      if (!error && data) {
        setFavorites(data.map(f => f.anime_id));
      }
    } catch (error) {
      console.error('Load favorites error:', error);
    }
  };

  const loadAllViews = async () => {
    try {
      const { data, error } = await supabase
        .from('anime_views')
        .select('anime_id, view_count');

      if (!error && data) {
        const viewsObj = {};
        data.forEach(v => {
          if (!viewsObj[v.anime_id]) {
            viewsObj[v.anime_id] = 0;
          }
          viewsObj[v.anime_id] += v.view_count;
        });
        setAllViews(viewsObj);
      }
    } catch (error) {
      console.error('Load all views error:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load carousel
      const { data: carouselItems, error: carouselError } = await supabase
        .from('anime_carousel')
        .select('*, anime_cards(*)')
        .order('position', { ascending: true });
      
      if (carouselError) throw carouselError;

      // Load anime cards
      const { data: cards, error: cardsError } = await supabase
        .from('anime_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;

      setCarouselData(carouselItems || []);
      setAnimeCards(cards || []);
      
      await loadAllViews();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Xatolik', 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (animeId) => {
    try {
      const isFavorite = favorites.includes(animeId);

      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('anime_id', animeId);

        if (!error) {
          setFavorites(favorites.filter(id => id !== animeId));
        }
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert([{ user_id: user.id, anime_id: animeId }]);

        if (!error) {
          setFavorites([...favorites, animeId]);
        }
      }
    } catch (error) {
      console.error('Favorite error:', error);
      Alert.alert('Xatolik', 'Sevimli qo\'shishda xatolik');
    }
  };

  const addView = async (animeId) => {
    try {
      const userId = user.id;
      
      const { data: existing } = await supabase
        .from('anime_views')
        .select('*')
        .eq('user_id', userId)
        .eq('anime_id', animeId)
        .single();

      if (existing) {
        const newCount = existing.view_count + 1;
        await supabase
          .from('anime_views')
          .update({ 
            view_count: newCount,
            last_viewed: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('anime_id', animeId);
      } else {
        await supabase
          .from('anime_views')
          .insert([{ 
            user_id: userId, 
            anime_id: animeId,
            view_count: 1
          }]);
      }
      
      await loadAllViews();
    } catch (error) {
      console.error('View error:', error);
    }
  };

  const goToAnime = (anime) => {
    addView(anime.id);
    navigation.navigate('AnimeDetail', { anime, user });
  };

  const filteredAnime = animeCards;

  const modalFilteredAnime = animeCards.filter(anime =>
    anime.title?.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  const openSearchModal = () => {
    setSearchModalVisible(true);
    setModalSearchQuery('');
  };

  const closeSearchModal = () => {
    setSearchModalVisible(false);
    setModalSearchQuery('');
  };

  const handleAnimeSelect = (anime) => {
    closeSearchModal();
    goToAnime(anime);
  };

  const renderCarousel = () => {
    if (carouselData.length === 0) return null;

    const currentItem = carouselData[currentSlide];
    if (!currentItem || !currentItem.anime_cards) return null;

    const anime = currentItem.anime_cards;

    return (
      <View style={styles.carouselContainer}>
        <Image 
          source={{ uri: anime.image_url }} 
          style={styles.carouselImage}
          resizeMode="cover"
        />
        
        <TouchableOpacity 
          style={styles.watchButtonTop}
          onPress={() => goToAnime(anime)}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={20} color="#FFFFFF" />
          <Text style={styles.watchButtonTopText}>Tomosha qilish</Text>
        </TouchableOpacity>

        <View style={styles.carouselOverlay}>
          <View style={styles.carouselContent}>
            <Text style={styles.carouselTitle} numberOfLines={2}>
              {anime.title}
            </Text>
            
            <View style={styles.carouselMeta}>
              <View style={styles.carouselMetaItem}>
                <Ionicons name="star" size={16} color="#fbbf24" />
                <Text style={styles.carouselMetaText}>{anime.rating}</Text>
              </View>
              <View style={styles.carouselMetaItem}>
                <Ionicons name="tv" size={16} color="#FFFFFF" />
                <Text style={styles.carouselMetaText}>{anime.episodes} qism</Text>
              </View>
            </View>

            {anime.genres && anime.genres.length > 0 && (
              <View style={styles.genresContainer}>
                {anime.genres.slice(0, 3).map((genre, idx) => (
                  <View key={idx} style={styles.genreBadge}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {carouselData.length > 1 && (
          <View style={styles.carouselDots}>
            {carouselData.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.carouselDot,
                  index === currentSlide && styles.carouselDotActive
                ]}
                onPress={() => setCurrentSlide(index)}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAnimeCard = ({ item }) => {
    const isFavorite = favorites.includes(item.id);
    
    return (
      <TouchableOpacity
        style={styles.animeCard}
        onPress={() => goToAnime(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardImageWrapper}>
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.cardImage}
            resizeMode="cover"
          />
          
          <View style={styles.cardHeader}>
            <View style={styles.cardViews}>
              <Ionicons name="eye" size={14} color="#FFFFFF" />
              <Text style={styles.cardViewsText}>{allViews[item.id] || 0}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.cardLikeBtn, isFavorite && styles.cardLikeBtnActive]}
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(item.id);
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={16} 
                color={isFavorite ? "#ef4444" : "#FFFFFF"} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.cardOverlay}>
            <View style={styles.cardOverlayMeta}>
              <View style={styles.cardRating}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text style={styles.cardRatingText}>{item.rating}</Text>
              </View>
              <Text style={styles.cardEpisodes}>{item.episodes} qism</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderModalAnimeCard = ({ item }) => {
    const isFavorite = favorites.includes(item.id);
    
    return (
      <TouchableOpacity
        style={styles.modalAnimeCard}
        onPress={() => handleAnimeSelect(item)}
        activeOpacity={0.8}
      >
        <Image 
          source={{ uri: item.image_url }} 
          style={styles.modalCardImage}
          resizeMode="cover"
        />
        
        <View style={styles.modalCardContent}>
          <Text style={styles.modalCardTitle} numberOfLines={2}>{item.title}</Text>
          
          <View style={styles.modalCardMeta}>
            <View style={styles.modalCardMetaItem}>
              <Ionicons name="star" size={14} color="#fbbf24" />
              <Text style={styles.modalCardMetaText}>{item.rating}</Text>
            </View>
            <View style={styles.modalCardMetaItem}>
              <Ionicons name="tv" size={14} color="#9CA3AF" />
              <Text style={styles.modalCardMetaText}>{item.episodes} qism</Text>
            </View>
            <View style={styles.modalCardMetaItem}>
              <Ionicons name="eye" size={14} color="#9CA3AF" />
              <Text style={styles.modalCardMetaText}>{allViews[item.id] || 0}</Text>
            </View>
          </View>

          {item.genres && item.genres.length > 0 && (
            <View style={styles.modalGenresContainer}>
              {item.genres.slice(0, 2).map((genre, idx) => (
                <Text key={idx} style={styles.modalGenreText}>{genre}</Text>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.modalCardLikeBtn, isFavorite && styles.modalCardLikeBtnActive]}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={18} 
            color={isFavorite ? "#ef4444" : "#9CA3AF"} 
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Yuklanmoqda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Profile', { user })}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>MochiTV</Text>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={openSearchModal}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={loadData}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {carouselData.length > 0 && renderCarousel()}

        <View style={styles.animeSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="film" size={24} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Anime Collection</Text>
          </View>

          {filteredAnime.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="film-outline" size={64} color="#374151" />
              <Text style={styles.emptyText}>Hali anime qo'shilmagan</Text>
            </View>
          ) : (
            <FlatList
              data={filteredAnime}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderAnimeCard}
              numColumns={2}
              columnWrapperStyle={styles.cardRow}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeSearchModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeSearchModal} />
          
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Anime qidirish</Text>
              <TouchableOpacity onPress={closeSearchModal} activeOpacity={0.7}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Anime nomini kiriting..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={modalSearchQuery}
                onChangeText={setModalSearchQuery}
                autoFocus={true}
              />
              {modalSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={modalFilteredAnime}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderModalAnimeCard}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalListContent}
              ListEmptyComponent={
                <View style={styles.modalEmptyContainer}>
                  <Ionicons name="search-outline" size={64} color="#374151" />
                  <Text style={styles.modalEmptyText}>
                    {modalSearchQuery ? 'Anime topilmadi' : 'Qidiruv uchun anime nomini kiriting'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  loadingText: {
    marginTop: 16,
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#1A1A1A',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  carouselContainer: {
    height: 300,
    position: 'relative',
    marginBottom: 20,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  watchButtonTop: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    zIndex: 10,
  },
  watchButtonTopText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  carouselOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  carouselContent: {
    gap: 12,
  },
  carouselTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  carouselMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  carouselMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carouselMetaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  genreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  carouselDots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  carouselDotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  animeSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  animeCard: {
    width: '48%',
  },
  cardImageWrapper: {
    width: '100%',
    aspectRatio: 2/3,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardHeader: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardViews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardViewsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardLikeBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLikeBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  cardOverlayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardRatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardEpisodes: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  cardContent: {
    paddingTop: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    height: 50,
  },
  modalSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 8,
    marginRight: 8,
    height: 40,
  },
  modalListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalAnimeCard: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalCardImage: {
    width: 100,
    height: 140,
  },
  modalCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  modalCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  modalCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalCardMetaText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  modalGenresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalGenreText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  modalCardLikeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCardLikeBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  modalEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  modalEmptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default Home;