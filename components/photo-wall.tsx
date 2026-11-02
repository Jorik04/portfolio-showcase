"use client";

import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Clock3,
    Heart,
    ImagePlus,
    MessageCircle,
    Send,
    Trash2,
    Upload,
} from "lucide-react";

const BOTTOM_NAV_OVERLAY_EVENT =
    "app-bottom-nav-overlay-change";

type WallPhoto = {
    id: string;
    uploaderName: string;
    caption: string;
    mimeType: string;
    createdAt: string;
    expiresAt: string;
    imageUrl: string;
    canDelete: boolean;
    visibility: "everyone" | "friends";
    likeCount: number;
    likedByMe: boolean;
    commentCount: number;
    isOwner: boolean;
};

type PhotoLiker = {
    id: string;
    name: string;
    email: string;
    likedAt: string;
};

type WallComment = {
    id: string;
    userId: string;
    authorName: string;
    body: string;
    createdAt: string;
    canDelete: boolean;
};

function formatRemaining(
    expiresAt: string,
    now: number,

) {
    const remainingSeconds = Math.max(
        0,
        Math.ceil(
            (new Date(expiresAt).getTime() - now) /
                1000,
        ),
    );

    const hours = Math.floor(
        remainingSeconds / 3600,
    );

    const minutes = Math.floor(
        (remainingSeconds % 3600) / 60,
    );

    const seconds = remainingSeconds % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
}

type PhotoWallProps = {
    showUploader?: boolean;
};

export default function PhotoWall({
    showUploader = true,
}: PhotoWallProps) {
    const [photos, setPhotos] = useState<WallPhoto[]>([]);

    const [loading, setLoading] = useState(true);

    const [uploading, setUploading] = useState(false);

    const [message, setMessage] = useState("");

    const [now, setNow] = useState(() => Date.now());

    const [likingPhotoId, setLikingPhotoId] = useState<string | null>(null);

    const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);

    const [comments, setComments] = useState<WallComment[]>([]);

    const [loadingComments, setLoadingComments] = useState(false);

    const [sendingComment, setSendingComment] = useState(false);

    const [likersFor, setLikersFor] = useState<string | null>(null);

    const [likers, setLikers] = useState<PhotoLiker[]>([]);

    const [loadingLikers, setLoadingLikers] = useState(false);

    const [captionFor, setCaptionFor] = useState<WallPhoto | null>(null);

    const holdTimer = useRef<number | null>(null);

    const holdWasTriggered = useRef(false);

    useEffect(() => {
        const bodyClass =
            "app-bottom-nav-overlay-open";
        const overlayIsOpen = Boolean(likersFor || openCommentsFor || captionFor);

        document.body.classList.toggle(
            bodyClass,
            overlayIsOpen,
        );

        window.dispatchEvent(
            new Event(BOTTOM_NAV_OVERLAY_EVENT),
        );

        return () => {
            document.body.classList.remove(bodyClass);
            window.dispatchEvent(
                new Event(BOTTOM_NAV_OVERLAY_EVENT),
            );
        };
    }, [likersFor, openCommentsFor, captionFor]);

    const loadPhotos = useCallback(async () => {
        try {
            const response = await fetch(
                "/api/photo-wall",
                {
                    method: "GET",
                    cache: "no-store",
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Could not load photos.",
                );
            } 

            setPhotos(data.photos);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not load photos.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Loading photo-wall photos
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadPhotos();

        const refreshTimer = 
            window.setInterval(() => {
                void loadPhotos();
            }, 30_000);

        return () => {
            window.clearInterval(refreshTimer);
        };
    }, [loadPhotos]);

    useEffect(() => {
        const clockTimer = 
            window.setInterval(() => {
                setNow(Date.now());
            }, 1000);
         return () => {
            window.clearInterval(clockTimer);
         };
    }, []); 

    const visiblePhotos = useMemo(
        () => 
            photos.filter(
                (photo) =>
                    new Date(
                        photo.expiresAt,
                    ).getTime() > now,
            ),
        [photos, now],
    );

    async function uploadPhoto(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const formElement =
            event.currentTarget;

        setUploading(true);
        setMessage("");

        try {
            const response = await fetch(
                "/api/photo-wall",
                {
                    method: "POST",
                    body: new FormData(
                        formElement,
                    ),
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ?? 
                        "Could not upload photo.",
                );
            }

            formElement.reset();

            setMessage(
                "Photo uploaded. It will disappear in 24 hours."
            );

            await loadPhotos();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message 
                    : "Could not upload photo.",
            );
        } finally {
            setUploading(false);
        }
    }

    async function deletePhoto(id: string) {
        const confirmed = window.confirm(
            "Delete this photo now?",
        );

        if (!confirmed) {
            return;
        }

        setMessage("");

        try {
            const response = await fetch(
                `/api/photo-wall/${id}`,
                {
                    method: "DELETE",
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Could not delete photo.",
                );
            }

            setPhotos((current) =>
                current.filter(
                    (photo) => photo.id !== id,
                ),
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not delete photo."
            );
        }
    }

    async function toggleLike(photoId: string) {
        setLikingPhotoId(photoId);
        setMessage("");

        try {
            const response = await fetch(
                `/api/photo-wall/${photoId}/like`,
                {
                    method: "POST",
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ?? "Could not update like.",
                );
            }

            setPhotos((current) =>
                current.map((photo) => 
                    photo.id === photoId
                        ? {
                            ...photo,
                            likedByMe: data.liked,
                            likeCount: data.likeCount,
                        }
                        : photo,
                    ),
                );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not update like."
            );
        } finally {
            setLikingPhotoId(null);
        }
    }

    async function toggleComments(photoId: string) {
        if (openCommentsFor === photoId) {
            setOpenCommentsFor(null);
            setComments([]);
            return;
        }

        setOpenCommentsFor(photoId);
        setComments([]);
        setLoadingComments(true);
        setMessage("");

        try {
            const response = await fetch(
                `/api/photo-wall/${photoId}/comments`,
                {
                    method: "GET",
                    cache: "no-store",
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Could not load comments."
                );
            }

            setComments(data.comments);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not load comments.",
            );

            setOpenCommentsFor(null);
        } finally {
            setLoadingComments(false);
        }
    }

    async function addComment(
        event: FormEvent<HTMLFormElement>,
        photoId: string,
    ) {
        event.preventDefault();

        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const body = String(form.get("comment") ?? "").trim();

        if (!body) {
            return;
        }

        setSendingComment(true);
        setMessage("");

        try {
            const response = await fetch(
                `/api/photo-wall/${photoId}/comments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ body }),
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Could not post comment.",
                );
            }

            setComments((current) => [
                ...current,
                data.comment,
            ]);

            setPhotos((current) => 
                current.map((photo) => 
                    photo.id === photoId
                        ? {
                            ...photo,
                            commentCount: 
                                photo.commentCount + 1,
                        }
                        : photo,
                ),
            );

            formElement.reset();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not post comment."
            );
        } finally {
            setSendingComment(false);
        }
    }

    async function deleteComment(
        photoId: string,
        commentId: string,
    ) {
        try {
            const response = await fetch(
                `/api/photo-wall/${photoId}/comments/${commentId}`,
                {
                    method: "DELETE",
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Could not delete comment.",
                );
            }

            setComments((current) =>
                current.filter(
                    (comment) => 
                            comment.id !== commentId,
                ),
            );

            setPhotos((current) =>
                current.map((photo) => 
                    photo.id === photoId
                        ? {
                            ...photo,
                            commentCount: Math.max(
                                0,
                                photo.commentCount - 1,
                            ),
                        }
                        : photo,
                ),
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not delete comment."
            );
        }
    }

    async function showLikers(photoId: string) {
        setLikersFor(photoId);
        setLoadingLikers(true);
        setLikers([]);

        try {
            const response = await fetch(
                `/api/photo-wall/${photoId}/like`,
                {
                    cache: "no-store",
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ?? "Could not lod likes.",
                );
            }

            setLikers(data.likers);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not load likes."
            );

            setLikersFor(null);
        } finally {
            setLoadingLikers(false);
        }
    }

    function startLikeHold(photo: WallPhoto) {
        if (!photo.isOwner) {
            return;
        }

        holdWasTriggered.current = false;

        holdTimer.current = window.setTimeout(() => {
            holdWasTriggered.current = true;
            void showLikers(photo.id);
        }, 550);
    }

    function cancelLikeHold() {
        if (holdTimer.current != null) {
            window.clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }
    }

    function handleLikeClick(photoId: string) {
        if (holdWasTriggered.current) {
            holdWasTriggered.current = false;
            return;
        }

        void toggleLike(photoId);
    }

    return (
        <div className="mx-auto max-w-6xl">
            <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10">
                <div className="max-w-2xl">
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-300">
                        Temporary memories
                    </p>

                    <h1 className="mt-3 text-4xl font-black sm:text-5xl">
                        The 24-hour photo wall
                    </h1>

                    <p className="mt-4 text-slate-300">
                        Share a moment. Every photo
                        disappears after one day.
                    </p>
                </div>

                {showUploader && (
                    <form
                        onSubmit={uploadPhoto}
                        className="browser-only mt-8 grid gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur lg:grid-cols-[1fr_1fr_180px_auto]"
                    >
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold">
                                Choose photo
                            </span>

                            <input
                                name="photo"
                                type="file"
                                required
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="block w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-bold file:text-indigo-700"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold">
                                Caption
                            </span>

                            <input
                                name="caption"
                                maxLength={160}
                                placeholder="What's happening?"
                                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none ring-indigo-400 focus:ring-2"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold">
                                Who can see it?
                            </span>

                            <select
                                name="visibility"
                                defaultValue="friends"
                                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900"
                            >
                                <option value="friends">
                                    Friends only
                                </option>

                                <option value="everyone">
                                    All signed-in users
                                </option>
                            </select>
                        </label>

                        <button 
                            type="submit"
                            disabled={uploading}
                            className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 font-bold hover:bg-indigo-400 disabled:opacity-50"
                        >
                            {uploading ? (
                                "Uploading..."
                            ) : (
                                <>
                                    <Upload size={18} />
                                    Upload
                                </>
                            )}
                        </button>
                    </form>
                )}
            </section>

            {message && (
                <p 
                    aria-live="polite"
                    className="mt-5 rounded-2xl border border-border bg-card p-4 text-center font-semibold text-card-foreground shadow-sm"
                >
                    {message}
                </p>
            )}

            {loading ? (
                <p className="py-16 text-center text-muted-foreground">
                    Loading photos...
                </p>
            ) : visiblePhotos.length === 0 ? (
                <section className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card/70 p-8 text-center">
                    <ImagePlus
                        size={44}
                        className="text-indigo-500"
                    />

                    <h2 className="mt-4 text-2xl font-black text-foreground">
                        The wall is empty
                    </h2>

                    <p className="mt-2 text-muted-foreground">
                        Upload the first photo before
                        the moment disappears.
                    </p>
                </section>
            ) : (
                <section className="mx-auto mt-3 max-w-xl space-y-3">
                    {visiblePhotos.map((photo) => (
                        <article
                            key={photo.id}
                            className="overflow-hidden rounded-3xl border border-border/60 bg-black shadow-lg"
                        >
                            <div className="relative flex max-h-[72svh] items-center justify-center overflow-hidden bg-black">
                                {/* eslint-disable-next-line @next/next/no-img-element -- Authenticated dynamic image retains its natural aspect ration. */}
                                <img
                                    src={photo.imageUrl}
                                    alt={
                                        photo.caption ||
                                        `Photo shared by ${photo.uploaderName}`
                                    }
                                    loading="lazy"
                                    className="block max-h-[72svh] w-full object-contain"
                                />

                                {/* Top shadow */}
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/85 via-black/30 to-transparent" />

                                {/* Name and visibility */}
                                <div className="absolute left-0 top-0 p-4 text-white drop-shadow-lg">
                                    <p className="text-lg font-black">
                                        {photo.uploaderName}
                                    </p>

                                    <p className="mt-0.5 text-xs font-bold text-indigo-200">
                                        {photo.visibility === "friends"
                                            ? "Friends only"
                                            : "All users"}
                                    </p>

                                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-300">
                                        <Clock3 size={14} />

                                        {formatRemaining(
                                            photo.expiresAt,
                                            now,
                                        )}
                                    </p>
                                </div>

                                {/* Bottom shadow */}
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                                {/* Actions */}
                                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
                                    <button
                                        type="button"
                                        disabled={
                                            likingPhotoId === photo.id
                                        }
                                        onPointerDown={() =>
                                            startLikeHold(photo)
                                        }
                                        onPointerUp={cancelLikeHold}
                                        onPointerLeave={cancelLikeHold}
                                        onPointerCancel={cancelLikeHold}
                                        onContextMenu={(event) =>
                                            event.preventDefault()
                                        }
                                        onClick={() =>
                                            handleLikeClick(photo.id)
                                        }
                                        className={`flex shrink-0 touch-manipulation select-none items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 font-bold text-white shadow-lg backdrop-blur-md ${
                                            photo.likedByMe
                                                ? "bg-rose-500/80"
                                                : "bg-black/45"
                                        } disabled:opacity-50 [-webkit-touch-callout:none]`}
                                    >
                                        <Heart
                                            size={20}
                                            fill={
                                                photo.likedByMe
                                                    ? "currentColor"
                                                    : "none"
                                            }
                                        />

                                        {photo.likeCount}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            void toggleComments(photo.id)
                                        }
                                        className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-3 py-2 font-bold text-white shadow-lg backdrop-blur-md"
                                    >
                                        <MessageCircle size={20} />
                                        {photo.commentCount}
                                    </button>

                                    {photo.caption ? (
                                        <button
                                            type="button"
                                            title={photo.caption}
                                            onClick={() =>
                                                setCaptionFor(photo)
                                            }
                                            className="min-w-0 flex-1 truncate rounded-full border border-white/20 bg-black/45 px-3 py-2 text-left text-sm font-medium text-white shadow-lg backdrop-blur-md"
                                        >
                                            {photo.caption}
                                        </button>
                                    ) : (
                                        <div className="min-w-0 flex-1" />
                                    )}

                                    {photo.canDelete && (
                                        <button
                                            type="button"
                                            aria-label="Delete photo"
                                            onClick={() =>
                                                void deletePhoto(photo.id)
                                            }
                                            className="shrink-0 rounded-full border border-white/20 bg-black/45 p-2.5 text-white shadow-lg backdrop-blur-md hover:bg-red-600/80"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}

            {captionFor && (
                <div 
                    className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
                    onClick={() => setCaptionFor(null)}
                >
                    <section 
                        className="max-h-[55dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
                        onClick={(event) => 
                            event.stopPropagation()
                        }
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-foreground">
                                    Caption
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    {captionFor.uploaderName}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setCaptionFor(null)
                                }
                                className="rounded-full bg-muted px-4 py-2 font-bold text-foreground"
                            >
                                Close
                            </button>
                        </div>

                        <p className="mt-5 whitespace-pre-wrap break-words text-foreground">
                                {captionFor.caption}
                        </p>
                    </section>
                </div>
            )}

            {openCommentsFor && (
                <div 
                    className="fixed inset-0 z-[150] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
                    onClick={() => {
                        setOpenCommentsFor(null);
                        setComments([]);
                    }}
                >
                    <section
                        className="flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <header className="flex items-center justify-between border-b border-border p-5">
                            <div>
                                <h2 className="text-2xl font-black text-foreground">
                                    Comments
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    {comments.length}{" "}
                                    {comments.length === 1
                                        ? "comment"
                                        : "comments"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setOpenCommentsFor(null);
                                    setComments([]);
                                }}
                                className="rounded-full bg-muted px-4 py-2 font-bold text-foreground"
                            >
                                Close
                            </button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto p-5">
                            {loadingComments ? (
                                <p className="text-muted-foreground">
                                    Loading comments...
                                </p>
                            ) : comments.length === 0 ? (
                                <div className="py-10 text-center">
                                    <MessageCircle
                                        size={38}
                                        className="mx-auto text-muted-foreground"
                                    />

                                    <p className="mt-3 font-bold text-foreground">
                                        No comments yet
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Be the first person to comment.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {comments.map((comment) => (
                                        <div 
                                            key={comment.id}
                                            className="flex items-start gap-3 rounded-2xl bg-muted p-3"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-black text-white">
                                                {comment.authorName
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-foreground">
                                                    {comment.authorName}
                                                </p>

                                                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                                                    {comment.body}
                                                </p>
                                            </div>

                                            {comment.canDelete && (
                                                <button 
                                                    type="button"
                                                    aria-label="Delete comment"
                                                    onClick={() =>
                                                        void deleteComment(
                                                            openCommentsFor,
                                                            comment.id,
                                                        )
                                                    }
                                                    className="rounded-full p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <form
                            onSubmit={(event) =>
                                addComment(event, openCommentsFor)
                            }
                            className="flex gap-2 border-t border-border bg-card p-4"
                        >
                            <input
                                name="comment"
                                required
                                maxLength={300}
                                autoComplete="off"
                                placeholder="Write a comment..."
                                className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                            />

                            <button
                                type="submit"
                                disabled={sendingComment}
                                aria-label="Post comment"
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Send size={19} />
                            </button>
                        </form>
                    </section>
                </div>
            )}

            {likersFor && (
                <div
                    className="fixed inset-0 z-[150] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
                    onClick={() => setLikersFor(null)}
                >
                    <section 
                        className="max-h-[70dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-foreground">
                                Liked by
                            </h2>

                            <button
                                type="button"
                                onClick={() => setLikersFor(null)}
                                className="rounded-full bg-muted px-4 py-2 font-bold"
                            >
                                Close
                            </button>
                        </div>
                        
                        <div className="mt-5 space-y-3">
                            {loadingLikers ? (
                                <p className="text-muted-foreground">
                                    Loading likes...
                                </p>
                            ) : likers.length === 0 ? (
                                <p className="text-muted-foreground">
                                    Nobody has liked this photo yet.
                                </p>
                            ) : (
                                likers.map((liker) => (
                                    <div 
                                        key={liker.id}
                                        className="flex items-center gap-3 rounded-2xl bg-muted p-3"
                                    >
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 font-black text-white">
                                            {liker.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div>
                                            <p className="font-bold text-foreground">
                                                {liker.name}
                                            </p>

                                            <p className="text-sm text-muted-foreground">
                                                {liker.email}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}


