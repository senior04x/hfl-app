import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { AppState, type StyleProp, type ViewStyle } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';

export type PlaybackSnapshot = {
    isLoaded: boolean;
    isPlaying: boolean;
    isBuffering: boolean;
    didJustFinish: boolean;
    positionMillis: number;
    durationMillis: number;
};
export type PlaybackVideoHandle = { restart: () => void; seek: (seconds: number) => void };
type Props = {
    uri: string;
    style: StyleProp<ViewStyle>;
    playing: boolean;
    muted: boolean;
    controls?: boolean;
    startSeconds?: number;
    intervalSeconds?: number;
    onLoad?: () => void;
    onFirstFrame?: () => void;
    onError?: (message: string) => void;
    onStatus?: (status: PlaybackSnapshot) => void;
};

// Own the native player inside the keyed media component so old story/retry
// instances release their resources and listeners when the source changes.
const PlaybackVideo = forwardRef<PlaybackVideoHandle, Props>(function PlaybackVideo({
    uri, style, playing, muted, controls = false, startSeconds = 0,
    intervalSeconds = 0.25, onLoad, onFirstFrame, onError, onStatus,
}, ref) {
    const loaded = useRef(false);
    const player = useVideoPlayer(uri, player => {
        player.loop = false;
        player.muted = muted;
        player.audioMixingMode = 'doNotMix';
        player.timeUpdateEventInterval = intervalSeconds;
    });
    const emitStatus = (didJustFinish = false) => onStatus?.({
        isLoaded: loaded.current,
        isPlaying: player.playing && player.status === 'readyToPlay',
        isBuffering: player.status === 'loading',
        didJustFinish,
        positionMillis: player.currentTime * 1000,
        durationMillis: player.duration * 1000,
    });
    const ready = () => {
        if (!loaded.current && player.status === 'readyToPlay') {
            loaded.current = true;
            player.currentTime = startSeconds;
            onLoad?.();
        }
    };
    useEventListener(player, 'statusChange', ({ status, error }) => {
        if (status === 'error') onError?.(error?.message || 'Video playback failed');
        ready();
        emitStatus();
    });
    useEventListener(player, 'playingChange', () => emitStatus());
    useEventListener(player, 'timeUpdate', () => emitStatus());
    useEventListener(player, 'playToEnd', () => emitStatus(true));
    useImperativeHandle(ref, () => ({
        restart: () => { player.currentTime = 0; player.play(); },
        seek: seconds => { player.currentTime = seconds; },
    }), [player]);
    useEffect(() => {
        player.muted = muted;
    }, [player, muted]);
    useEffect(() => {
        ready();
        if (playing && AppState.currentState === 'active') player.play();
        else player.pause();
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active' && playing) player.play();
            else player.pause();
        });
        return () => subscription.remove();
    }, [player, playing]);
    return <VideoView player={player} style={style} contentFit="contain"
        surfaceType="textureView" nativeControls={controls} onFirstFrameRender={onFirstFrame} />;
});
export default PlaybackVideo;
