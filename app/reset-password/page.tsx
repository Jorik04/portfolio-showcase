import ResetPasswordForm from "./reset-password-form";

type ResetPasswordPageProps = {
    searchParams: Promise<{
        token?: string | string[];
        error?: string | string[];
    }>
};

export default async function ResetPasswordPage({
    searchParams,
}: ResetPasswordPageProps) {
    const query = await searchParams;

    const token =
        typeof query.token === "string"
            ? query.token
            : undefined;

    const tokenError =
        typeof query.error === "string"
            ? query.error
            : undefined;

    return (
        <ResetPasswordForm
            token={token}
            tokenError={tokenError}
        />
    );
}