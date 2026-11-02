"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import {
    RefreshCcw,
    RotateCcw,
    Send,
} from "lucide-react";

type FacingMode = "user" | "environment";

function stopStream(stream: MediaStream | null ) {
    stream?.getTracks().forEach((track) => {
        track.stop();
    });
}

export default function CameraCapture() {
    const router = useRouter();

    const videoRef = 
        useRef<HTMLVideoElement | null>(null);

    const streamRef = 
        useRef<MediaStream | null>(null);

    const [facingMode, setFacingMode] = 
        useState<FacingMode>("environment");

    const [capturedPhoto, setCapturedPhoto] =
        useState<Blob | null>(null);

    const [previewUrl, setPreviewUrl] =
        useState<string | null>(null);

    const [caption, setCaption] = useState("");

    const [visibility, setVisibility] = 
        useState<"friends" | "everyone">(
            "friends",
        );

    const [cameraError, setCameraError] = 
        useState("");

    const [posting, setPosting] =
        useState(false);

    useEffect(() => {
        let cancelled = false;

        async function connectCamera() {
            setCameraError("");

            if (!navigator.mediaDevices?.getUserMedia) {
                setCameraError(
                    "This browser does not support camera access.",
                );
                return;
            }

            stopStream(streamRef.current);

            try {
                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: {
                                ideal: facingMode,
                            },
                            width: {
                                ideal: 1080,
                            },
                            height: {
                                ideal: 1440,
                            },
                            aspectRatio: {
                                ideal: 3 / 4,
                            },
                        },
                        audio: false,
                    });
                
                if (cancelled) {
                    stopStream(stream);
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = 
                        stream;

                    await videoRef.current
                        .play()
                        .catch(() => undefined);
                }
            } catch {
                setCameraError(
                    "Camera access was denied. Allow camera access in your browser settings.",
                );
            }
        }

        void connectCamera();

        return () => {
            cancelled = true;
            stopStream(streamRef.current);
            streamRef.current = null;
        };
    }, [facingMode]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    async function takePhoto() {
        const video = videoRef.current;

        if (
            !video ||
            video.videoWidth === 0 ||
            video.videoHeight === 0 
        ) {
            setCameraError(
                "The camera is not ready yet."
            );
            return;
        }

        const maximumDimension = 1600;

        const scale = Math.min(
            1, 
            maximumDimension /
                Math.max(
                    video.videoWidth,
                    video.videoHeight,
                ),
        );

        const width = Math.round(
            video.videoWidth * scale,
        )

        const height = Math.round(
            video.videoHeight * scale,
        );

        const canvas = 
            document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
            setCameraError(
                "Could not capture the photo.",
            );
            return;
        }

        if (facingMode === "user") {
            context.translate(width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(
            video,
            0,
            0,
            width,
            height,
        );

        const blob = await new Promise<Blob>(
            (resolve, reject) => {
                canvas.toBlob(
                    (result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(
                                new Error(
                                    "Could not create photo.",
                                ),
                            );
                        }
                    },
                    "image/jpeg",
                    0.88,
                );
            },
        );

        setCapturedPhoto(blob);
        setPreviewUrl(URL.createObjectURL(blob));
    }

    function retakePhoto() {
        setCapturedPhoto(null);
        setPreviewUrl(null);
        setCameraError("");
    }

    async function postPhoto() {
        if (!capturedPhoto) {
            return;
        }

        setPosting(true);
        setCameraError("")

        try {
            const formData = new FormData();

            formData.append(
                "photo",
                new File(
                    [capturedPhoto],
                    `camera-${Date.now()}.jpg`,
                    {
                        type: "image/jpeg",
                    },
                ),
            );

            formData.append(
                "caption",
                caption.trim(),
            );

            formData.append(
                "visibility",
                visibility,
            );

            const response = await fetch(
                "/api/photo-wall",
                {
                    method: "POST",
                    body: formData,
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Could not post the photo.",
                );
            }

            router.push("/");
            router.refresh();
        } catch (error) {
            setCameraError(
                error instanceof Error
                    ? error.message
                    : "Could not post the photo.",
            );
        } finally {
            setPosting(false);
        }
    }

    return (
        <main className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-background text-foreground">
            <section className="relative h-full w-full overflow-hidden">
                <div className="absolute left-1/2 top-1/2 aspect-square w-[min(92vw,32rem,62dvh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] bg-black shadow-2xl">
                    {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- The local blob URL cannot benefit from Next image optimization.
                        <img
                            src={previewUrl}
                            alt="Captured photo preview"
                            className="block h-full w-full object-contain"
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            onLoadedMetadata={(event) => {
                                void event.currentTarget.play();
                            }}
                            className={`block h-full w-full object-contain ${
                                facingMode === "user"
                                    ? "-scale-x-100"
                                    : ""
                            }`}
                        />
                    )}

                    {!previewUrl && (
                        <>
                            <button
                                type="button"
                                aria-label="Switch camera"
                                onClick={() =>
                                    setFacingMode((current) =>
                                        current === "environment"
                                            ? "user"
                                            : "environment",
                                    )
                                }
                                className="absolute right-4 top-4 rounded-full bg-black/50 p-3 text-white shadow-lg backdrop-blur-md"
                            >
                                <RefreshCcw size={24} />
                            </button>

                        </>
                    )}

                    {previewUrl && (
                        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={retakePhoto}
                                className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-3 font-bold text-white shadow-lg backdrop-blur-md"
                            >
                                <RotateCcw size={19} />
                                Retake
                            </button>

                            <button
                                type="button"
                                disabled={posting}
                                onClick={() => void postPhoto()}
                                className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg disabled:opacity-50"
                            >
                                <Send size={19} />

                                {posting ? "Posting..." : "Post"}
                            </button>
                        </div>
                    )}
                    {previewUrl && (
                        <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-black via-black/85 to-transparent p-4 pt-14">
                            <input
                                value={caption}
                                onChange={(event) =>
                                    setCaption(event.target.value)
                                }
                                maxLength={160}
                                placeholder="Write a caption..."
                                className="w-full rounded-2xl border border-white/15 bg-black/55 px-4 py-3 text-white outline-none placeholder:text-white/60 focus:ring-2 focus:ring-indigo-400"
                            />

                            <select
                                value={visibility}
                                onChange={(event) =>
                                    setVisibility(
                                        event.target.value === "everyone"
                                            ? "everyone"
                                            : "friends",
                                    )
                                }
                                className="w-full rounded-2xl border border-white/15 bg-black/55 px-4 py-3 text-white outline-none"
                            >
                                <option value="friends">
                                    Friends only
                                </option>

                                <option value="everyone">
                                    All signed-in users
                                </option>
                            </select>
                        </div>
                    )}
                </div>

                {!previewUrl && (
                    <button
                        type="button"
                        aria-label="Take photo"
                        onClick={() => void takePhoto()}
                        className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] left-1/2 z-20 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border-4 border-slate-400 bg-background shadow-xl dark:border-white"
                    >
                        <span className="h-16 w-16 rounded-full bg-slate-400 dark:bg-white" />
                    </button>
                )}
            </section>

            {cameraError && (
                <p className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] left-4 right-4 z-30 mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-950/90 p-4 text-center font-semibold text-red-200 shadow-xl">
                    {cameraError}
                </p>
            )}
        </main>
    );
}
