import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { supabase } from './supabaseClient';

const { width, height } = Dimensions.get('window');

const AnimeDetail = ({ navigation, route }) => {
  const { anime, user } = route.params;
  const videoRef = useRef(null);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);
  const [videoStatus, setVideoStatus] = useState({});
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    checkFavorite();
    loadViewCount();
    loadEpisodes();
    loadComments();

    return () => {
      // Komponent unmount bo'lganda ekranni portrait ga qaytarish
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      StatusBar.setHidden(false);
    };
  }, []);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.loadAsync({ uri: videoUrl }, {}, false);
    }
  }, [videoUrl]);

  const checkFavorite = async () => {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('anime_id', anime.id)
        .single();

      if (!error && data) {
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Check favorite error:', error);
    }
  };

  const loadViewCount = async () => {
    try {
      const { data, error } = await supabase
        .from('anime_views')
        .select('view_count')
        .eq('anime_id', anime.id);

      if (!error && data) {
        const totalViews = data.reduce((sum, item) => sum + item.view_count, 0);
        setViewCount(totalViews);
      }
    } catch (error) {
      console.error('Load view count error:', error);
    }
  };

  const loadEpisodes = async () => {
    try {
      const { data, error } = await supabase
        .from('anime_episodes')
        .select('*')
        .eq('anime_id', anime.id)
        .order('episode_number', { ascending: true });

      if (!error && data && data.length > 0) {
        setEpisodes(data);
        setCurrentEpisode(data[0]);
        if (data[0].video_url) {
          setVideoUrl(data[0].video_url);
        }
      } else {
        setEpisodes([]);
      }
    } catch (error) {
      console.error('Episodes load error:', error);
      setEpisodes([]);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('anime_comments')
        .select('*')
        .eq('anime_id', anime.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setComments(data || []);
      }
    } catch (error) {
      console.error('Comments load error:', error);
    }
  };

  const selectEpisode = async (episode) => {
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
      await videoRef.current.unloadAsync();
    }
    
    setCurrentEpisode(episode);
    if (episode.video_url) {
      setVideoUrl(episode.video_url);
    }
  };

  const toggleFavorite = async () => {
    try {
      setLoading(true);
      
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('anime_id', anime.id);

        if (!error) {
          setIsFavorite(false);
        }
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert([{ user_id: user.id, anime_id: anime.id }]);

        if (!error) {
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Ogohlantirish', 'Izoh matnini kiriting');
      return;
    }

    try {
      const { error } = await supabase
        .from('anime_comments')
        .insert([{
          anime_id: anime.id,
          username: user.username,
          comment_text: commentText,
          created_at: new Date().toISOString(),
        }]);

      if (!error) {
        setCommentText('');
        loadComments();
      }
    } catch (error) {
      console.error('Add comment error:', error);
      Alert.alert('Xatolik', 'Izoh qo\'shilmadi');
    }
  };

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (videoStatus.isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const handleSeek = async (direction) => {
    if (!videoRef.current || !videoStatus.positionMillis) return;

    const newPosition = videoStatus.positionMillis + (direction === 'forward' ? 10000 : -10000);
    await videoRef.current.setPositionAsync(Math.max(0, newPosition));
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      // Fullscreen dan chiqish
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      StatusBar.setHidden(false);
      setIsFullscreen(false);
    } else {
      // Fullscreen ga o'tish
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      StatusBar.setHidden(true);
      setIsFullscreen(true);
    }
  };

  // Fullscreen komponenti
  if (isFullscreen) {
    return (
      <View style={styles.fullscreenContainer}>
        <TouchableOpacity 
          style={styles.fullscreenVideoContainer}
          activeOpacity={1}
          onPress={() => setShowControls(!showControls)}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.fullscreenVideo}
            useNativeControls={false}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            onPlaybackStatusUpdate={status => {
              setVideoStatus(status);
              setIsBuffering(status.isBuffering);
            }}
          />

          {/* Fullscreen Controls */}
          {showControls && (
            <View style={styles.videoControls}>
              {/* Top Bar */}
              <View style={styles.controlsTop}>
                <TouchableOpacity 
                  style={styles.fullscreenExitButton}
                  onPress={toggleFullscreen}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.episodeTitle}>
                  {anime.title} - Qism {currentEpisode.episode_number}
                </Text>
              </View>

              {/* Center Controls */}
              <View style={styles.controlsCenter}>
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={() => handleSeek('backward')}
                >
                  <Ionicons name="play-back" size={32} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.playButton}
                  onPress={handlePlayPause}
                >
                  {isBuffering ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <Ionicons 
                      name={videoStatus.isPlaying ? "pause" : "play"} 
                      size={48} 
                      color="#FFFFFF" 
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={() => handleSeek('forward')}
                >
                  <Ionicons name="play-forward" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Bottom Bar */}
              <View style={styles.controlsBottom}>
                <View style={styles.bottomRow}>
                  <Text style={styles.timeText}>
                    {formatTime(videoStatus.positionMillis)} / {formatTime(videoStatus.durationMillis)}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.fullscreenButton}
                    onPress={toggleFullscreen}
                  >
                    <Ionicons 
                      name="contract" 
                      size={24} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { 
                        width: `${(videoStatus.positionMillis / videoStatus.durationMillis) * 100 || 0}%` 
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: anime.image_url }} 
            style={styles.headerImage}
            resizeMode="cover"
          />
          
          <View style={styles.gradientOverlay} />
          
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity 
            style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
            onPress={toggleFavorite}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#ef4444" : "#FFFFFF"} 
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{anime.title}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={18} color="#fbbf24" />
              <Text style={styles.statText}>{anime.rating}</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="tv" size={18} color="#3B82F6" />
              <Text style={styles.statText}>{anime.episodes} qism</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="eye" size={18} color="#8B5CF6" />
              <Text style={styles.statText}>{viewCount}</Text>
            </View>
          </View>

          {/* Video Player */}
          {videoUrl && currentEpisode && (
            <View style={styles.videoSection}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="play-circle" size={20} color="#3B82F6" />
                {' '}{currentEpisode.episode_number}-qism
              </Text>
              
              <TouchableOpacity 
                style={styles.videoContainer}
                activeOpacity={1}
                onPress={() => setShowControls(!showControls)}
              >
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  style={styles.video}
                  useNativeControls={false}
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping={false}
                  onPlaybackStatusUpdate={status => {
                    setVideoStatus(status);
                    setIsBuffering(status.isBuffering);
                  }}
                />

                {/* Custom Controls */}
                {showControls && (
                  <View style={styles.videoControls}>
                    {/* Top Bar */}
                    <View style={styles.controlsTop}>
                      <Text style={styles.episodeTitle}>
                        {anime.title} - Qism {currentEpisode.episode_number}
                      </Text>
                    </View>

                    {/* Center Controls */}
                    <View style={styles.controlsCenter}>
                      <TouchableOpacity 
                        style={styles.controlButton}
                        onPress={() => handleSeek('backward')}
                      >
                        <Ionicons name="play-back" size={32} color="#FFFFFF" />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.playButton}
                        onPress={handlePlayPause}
                      >
                        {isBuffering ? (
                          <ActivityIndicator size="large" color="#FFFFFF" />
                        ) : (
                          <Ionicons 
                            name={videoStatus.isPlaying ? "pause" : "play"} 
                            size={48} 
                            color="#FFFFFF" 
                          />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.controlButton}
                        onPress={() => handleSeek('forward')}
                      >
                        <Ionicons name="play-forward" size={32} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Bottom Bar */}
                    <View style={styles.controlsBottom}>
                      <View style={styles.bottomRow}>
                        <Text style={styles.timeText}>
                          {formatTime(videoStatus.positionMillis)} / {formatTime(videoStatus.durationMillis)}
                        </Text>
                        
                        <TouchableOpacity 
                          style={styles.fullscreenButton}
                          onPress={toggleFullscreen}
                        >
                          <Ionicons 
                            name={isFullscreen ? "contract" : "expand"} 
                            size={24} 
                            color="#FFFFFF" 
                          />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBar,
                            { 
                              width: `${(videoStatus.positionMillis / videoStatus.durationMillis) * 100 || 0}%` 
                            }
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              {/* Episodes Grid */}
              {episodes.length > 0 && (
                <View style={styles.episodesSection}>
                  <Text style={styles.episodesTitle}>Barcha qismlar</Text>
                  <View style={styles.episodesGrid}>
                    {episodes.map((episode) => (
                      <TouchableOpacity
                        key={episode.id}
                        style={[
                          styles.episodeBtn,
                          currentEpisode?.id === episode.id && styles.episodeBtnActive
                        ]}
                        onPress={() => selectEpisode(episode)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.episodeText,
                          currentEpisode?.id === episode.id && styles.episodeTextActive
                        ]}>
                          {episode.episode_number}-Qism
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <View style={styles.genresSection}>
              <Text style={styles.sectionTitle}>Janrlar</Text>
              <View style={styles.genresContainer}>
                {anime.genres.map((genre, index) => (
                  <View key={index} style={styles.genreBadge}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          {anime.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Tavsif</Text>
              <Text 
                style={styles.description}
                numberOfLines={descExpanded ? undefined : 4}
              >
                {anime.description}
              </Text>
              {anime.description.length > 150 && (
                <TouchableOpacity 
                  onPress={() => setDescExpanded(!descExpanded)}
                  style={styles.readMoreBtn}
                >
                  <Text style={styles.readMoreText}>
                    {descExpanded ? 'Kamroq' : 'Ko\'proq'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>
              Izohlar ({comments.length})
            </Text>

            <View style={styles.commentForm}>
              <TextInput
                style={styles.commentInput}
                placeholder="Izoh qoldiring..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity 
                style={styles.commentSubmitBtn}
                onPress={handleAddComment}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.commentsList}>
              {comments.length === 0 ? (
                <Text style={styles.noComments}>Hali izohlar yo'q</Text>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.comment}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {comment.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUsername}>{comment.username}</Text>
                        <Text style={styles.commentDate}>
                          {new Date(comment.created_at).toLocaleDateString('uz-UZ')}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment.comment_text}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  imageContainer: {
    width: width,
    height: width * 1.2,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  content: {
    padding: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#262626',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#374151',
    marginHorizontal: 16,
  },
  videoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  videoContainer: {
    width: '100%',
    height: width * 0.56,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoControls: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  controlsTop: {
    padding: 16,
  },
  episodeTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsBottom: {
    padding: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  fullscreenButton: {
    padding: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  episodesSection: {
    marginTop: 20,
  },
  episodesTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  episodeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  episodeBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  episodeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  episodeTextActive: {
    color: '#FFFFFF',
  },
  genresSection: {
    marginBottom: 24,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  genreText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  description: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  readMoreBtn: {
    marginTop: 8,
  },
  readMoreText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsSection: {
    marginBottom: 32,
  },
  commentForm: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#262626',
    maxHeight: 100,
  },
  commentSubmitBtn: {
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    gap: 16,
  },
  noComments: {
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 30,
  },
  comment: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  commentDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  commentText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
  // Fullscreen Styles
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenVideoContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  fullscreenExitButton: {
    padding: 8,
    marginRight: 12,
  },
});

export default AnimeDetail;