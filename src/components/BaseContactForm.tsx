"use client";

import { FormEvent, ReactNode, useState } from "react";

export type SubmitState = {
    status: "idle" | "submitting" | "success" | "error";
    message: string;
};

export type BaseContactSubmitResult = {
    mode?: "online" | "queued";
    successMessage?: string;
};

const initialState: SubmitState = { status: "idle", message: "" };

interface BaseContactFormProps {
    onSubmit: (formData: FormData) => Promise<void | BaseContactSubmitResult>;
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
        const form = event.currentTarget;
        setState({ status: "submitting", message: "Submitting..." });

        try {
            const result = await onSubmit(new FormData(form));
            form.reset();
            setState({
                status: "success",
                message: result?.successMessage || successMessage,
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
