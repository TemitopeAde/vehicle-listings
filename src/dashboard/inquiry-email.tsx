import { useEffect, useRef, useState } from "react";
import type ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { toast } from "sonner";
import type { Inquiry } from "../shared/schemas";
import { api } from "./api";
import { useResource } from "./hooks";
import { Button } from "./components/ui/button";
import { LoadState } from "./components/common";

const modules = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};
const formats = ["bold", "italic", "underline", "list", "bullet", "link"];

export function InquiryEmail({
  inquiry,
  reload,
}: {
  inquiry: Inquiry;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  async function retryConfirmation() {
    setRetrying(true);
    try {
      const result = await api<{ status: string }>(
        "inquiry-emails",
        { id: inquiry._id },
        "PATCH",
      );
      if (result.status !== "queued")
        throw new Error(
          "Confirmation could not be queued. Check Wix email permissions and sending quota.",
        );
      toast.success("Confirmation email queued");
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not queue confirmation.",
      );
    } finally {
      setRetrying(false);
    }
  }
  return (
    <div className="my-5 space-y-3">
      <div className="flex items-center flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? "Close email composer" : "Email buyer"}
        </Button>
        <span className="hint">
          Confirmation:{" "}
          {inquiry.confirmationEmailStatus === "queued"
            ? "queued with Wix"
            : inquiry.confirmationEmailStatus === "failed"
              ? "could not be queued"
              : "not yet queued"}
        </span>
        {inquiry.confirmationEmailStatus !== "queued" && (
          <Button
            variant="outline"
            size="sm"
            disabled={retrying}
            onClick={() => void retryConfirmation()}
          >
            Retry confirmation
          </Button>
        )}
      </div>
      {open && (
        <EmailComposer
          endpoint="inquiry-emails"
          recipient={{
            id: inquiry._id,
            name: inquiry.name,
            email: inquiry.email,
          }}
          defaultSubject="Your vehicle inquiry"
        />
      )}
    </div>
  );
}

/** Composes an email to the person behind an inquiry or quote request; the server picks the address from `recipient.id`. */
export function EmailComposer({
  endpoint,
  recipient,
  defaultSubject,
}: {
  endpoint: "inquiry-emails" | "quote-request-emails";
  recipient: { id: string; name: string; email: string };
  defaultSubject: string;
}) {
  // Branding is the same for every email, so it is always read from the inquiry endpoint.
  const branding = useResource<{
    siteName: string;
    enabled: boolean;
    replyTo?: string;
  }>("inquiry-emails");
  const [Editor, setEditor] = useState<typeof ReactQuill | null>(null);
  const [editorError, setEditorError] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [html, setHtml] = useState("");
  const [hasText, setHasText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [queued, setQueued] = useState(false);
  const editorRef = useRef<ReactQuill | null>(null);
  const editorContainer = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let active = true;
    // Quill requires the DOM, so load it only after the dashboard mounts.
    void import("react-quill")
      .then((module) => {
        if (active) setEditor(() => module.default);
      })
      .catch(() => {
        if (active)
          setEditorError(
            "Could not load the email editor. Refresh the dashboard and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const root = editorRef.current?.getEditor().root;
    if (root) {
      root.setAttribute("role", "textbox");
      root.setAttribute("aria-label", "Email message");
      root.setAttribute("aria-multiline", "true");
      root.setAttribute("aria-required", "true");
    }
    editorContainer.current
      ?.querySelectorAll(".ql-toolbar button")
      .forEach((button) => {
        const format = button.className
          .replace("ql-", "")
          .replace(" ql-active", "");
        button.setAttribute(
          "aria-label",
          format === "list"
            ? `${button.getAttribute("value") === "ordered" ? "Numbered" : "Bulleted"} list`
            : format === "clean"
              ? "Clear formatting"
              : format[0]?.toUpperCase() + format.slice(1),
        );
        if (button instanceof HTMLButtonElement)
          button.disabled = busy || queued;
      });
  }, [Editor, busy, queued]);
  async function send() {
    if (busy || queued) return;
    setBusy(true);
    try {
      await api(endpoint, {
        id: recipient.id,
        subject,
        html,
        idempotencyKey: key,
      });
      setQueued(true);
      toast.success("Email queued with Wix");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not queue the email.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-3 border rounded-lg p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <LoadState {...branding} retry={() => void branding.reload()} />
      <p className="text-sm">
        To: {recipient.name} &lt;{recipient.email}&gt;
      </p>
      <label className="label" htmlFor="email-subject">
        Subject
      </label>
      <input
        id="email-subject"
        className="field"
        required
        maxLength={150}
        value={subject}
        disabled={busy || queued}
        onChange={(event) => {
          setSubject(event.target.value);
          setKey(crypto.randomUUID());
        }}
      />
      <p className="label">Message</p>
      {editorError && <p role="alert">{editorError}</p>}
      {Editor ? (
        <div ref={editorContainer} className="[&_.ql-editor]:min-h-48">
          <Editor
            ref={editorRef}
            theme="snow"
            value={html}
            modules={modules}
            formats={formats}
            readOnly={busy || queued}
            onChange={(value, _delta, source, editor) => {
              setHtml(value);
              setHasText(Boolean(editor.getText().trim()));
              if (source === "user") setKey(crypto.randomUUID());
            }}
          />
        </div>
      ) : (
        !editorError && <p role="status">Loading email editor…</p>
      )}
      {branding.data && (
        <p className="hint">
          {branding.data.siteName} is automatically included in the subject and
          email.{" "}
          {branding.data.replyTo && `Replies go to ${branding.data.replyTo}.`}
        </p>
      )}
      {branding.data && !branding.data.enabled && (
        <p className="hint">Email sending is unavailable in the local demo.</p>
      )}
      {queued ? (
        <p role="status">Email queued with Wix.</p>
      ) : (
        <Button
          type="submit"
          pending={busy}
          disabled={
            busy ||
            !Editor ||
            !hasText ||
            !subject.trim() ||
            !branding.data?.enabled
          }
        >
          Send email
        </Button>
      )}
    </form>
  );
}
