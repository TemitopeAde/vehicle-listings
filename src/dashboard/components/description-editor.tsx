import { useEffect, useRef, useState } from "react";
import type ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useI18n } from "../../shared/i18n-react";

const modules = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};
const formats = ["bold", "italic", "underline", "list", "bullet", "link"];

export function DescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string, source: string) => void;
}) {
  const { t } = useI18n();
  const [Editor, setEditor] = useState<typeof ReactQuill | null>(null);
  const [editorError, setEditorError] = useState("");
  const editorRef = useRef<ReactQuill | null>(null);
  const editorContainer = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let active = true;
    void import("react-quill")
      .then((module) => {
        if (active) setEditor(() => module.default);
      })
      .catch(() => {
        if (active)
          setEditorError(
            "Could not load the description editor. Refresh the page and try again.",
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
      root.setAttribute("aria-labelledby", "description-label");
      root.setAttribute("aria-multiline", "true");
    }
    editorContainer.current
      ?.querySelectorAll(".ql-toolbar button")
      .forEach((button) => {
        if (button instanceof HTMLButtonElement) button.type = "button";
        const format = button.className
          .replace("ql-", "")
          .replace(" ql-active", "");
        button.setAttribute(
          "aria-label",
          t(
            format === "list"
              ? `${button.getAttribute("value") === "ordered" ? "Numbered" : "Bulleted"} list`
              : format === "clean"
                ? "Clear formatting"
                : format[0]?.toUpperCase() + format.slice(1),
          ),
        );
      });
  }, [Editor, value, t]);
  return (
    <div>
      <p className="label" id="description-label">
        {t("Description")}
      </p>
      {editorError && <p role="alert">{t(editorError)}</p>}
      {Editor ? (
        <div
          ref={editorContainer}
          className="[&_.ql-container]:rounded-b-md [&_.ql-editor]:min-h-48 [&_.ql-toolbar]:rounded-t-md"
        >
          <Editor
            ref={editorRef}
            theme="snow"
            value={value}
            modules={modules}
            formats={formats}
            placeholder={t(
              "Describe condition, history and verified features. Avoid unverified claims.",
            )}
            onChange={(html, _delta, source) => {
              onChange(html, source);
            }}
          />
        </div>
      ) : (
        !editorError && (
          <p role="status" className="hint">
            {t("Loading description editor…")}
          </p>
        )
      )}
    </div>
  );
}
