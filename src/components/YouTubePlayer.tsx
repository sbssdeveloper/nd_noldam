"use client";

import React, { useMemo, useCallback } from "react";
import YouTube, { YouTubeProps } from "react-youtube";

interface YouTubePlayerProps {
    url: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ url }) => {
    // Extract video ID from various YouTube URL formats - memoized to prevent recalculation

    const getVideoId = useCallback((url: string): string | null => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }, []);

    // Memoize video ID extraction to prevent unnecessary recalculations
    const videoId = useMemo(() => getVideoId(url), [url, getVideoId]);

    // Memoize player options to prevent object recreation on every render
    const opts: YouTubeProps["opts"] = useMemo(() => ({
        width: "100%",
        height: "200",
        playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1, // ✅ allows inline playback on iOS
            enablejsapi: 1, // ✅ ensures the iframe supports JS API
        },
    }), []);

    // Memoize error state to prevent unnecessary re-renders
    const errorState = useMemo(() => (
        <div className="w-full max-w-2xl aspect-video mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Invalid YouTube URL</p>
        </div>
    ), []);

    if (!videoId) {
        return errorState;
    }

    return (
        <div className="w-full max-w-2xl aspect-video mx-auto">
            <YouTube
                videoId={videoId}
                opts={opts}
                // Add key prop to force re-mount when videoId changes
                key={videoId}
            />
        </div>
    );
};

export default YouTubePlayer;
