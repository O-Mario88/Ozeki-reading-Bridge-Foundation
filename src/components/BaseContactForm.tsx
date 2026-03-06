"use client";

import { FormEvent, ReactNode, useState } from "react";

export type SubmitState = {
    status: "idle" | "submitting" | "success" | "error";
    message: string;
};

const initialState: SubmitState = { status: "idle", message: "" };

interface BaseContactFormProps {
    onSubmit: (formData: FormData) => Promise<void>;
    onSuccess?: () => void;
    onCancel?: () => void;
    successMessage: string;
    submitLabel: string;
    submittingLabel: string;
    children: ReactNode;
}

export function BaseContactForm({
    onSubmit,
    onSuccess,
    onCancel,
    successMessage,
    submitLabel,
    submittingLabel,
    children,
}: BaseContactFormProps) {
    const [state, setState] = useState<SubmitState>(initialState);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setState({ status: "submitting", message: "Submitting..." });

        try {
            await onSubmit(new FormData(event.currentTarget));
            event.currentTarget.reset();
            setState({
                status: "success",
                message: successMessage,
            });
            if (onSuccess) {
                window.setTimeout(() => {
                    onSuccess();
                }, 800);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Submission failed.";
            setState({ status: "error", message });
        }
    }

    return (
        <form className="form-grid" onSubmit={handleSubmit}>
            {children}

            <div className="action-row">
                <button className="button" type="submit" disabled={state.status === "submitting"}>
                    {state.status === "submitting" ? submittingLabel : submitLabel}
                </button>
                {onCancel ? (
                    <button className="button button-ghost" type="button" onClick={onCancel}>
                        Cancel
                    </button>
                ) : null}
            </div>

            {state.message ? <p className={`form-message ${state.status}`}>{state.message}</p> : null}
        </form>
    );
}
