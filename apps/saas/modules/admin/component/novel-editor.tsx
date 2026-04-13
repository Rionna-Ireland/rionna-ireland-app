"use client";

import {
	type JSONContent,
	EditorRoot,
	EditorContent,
	EditorCommand,
	EditorCommandEmpty,
	type EditorInstance,
} from "novel";
import {
	handleCommandNavigation,
	ImageResizer,
	handleImageDrop,
	handleImagePaste,
	defaultExtensions,
} from "novel/extensions";

interface NovelEditorProps {
	initialContent?: JSONContent;
	onChange?: (data: { json: JSONContent; html: string }) => void;
	onUploadImage?: (file: File) => Promise<string>;
}

export function NovelEditor({ initialContent, onChange, onUploadImage }: NovelEditorProps) {
	const extensions = [...defaultExtensions];

	const handleUpdate = (editor: EditorInstance) => {
		const json = editor.getJSON() as JSONContent;
		const html = editor.getHTML();
		onChange?.({ json, html });
	};

	const uploadFn = async (file: File) => {
		if (onUploadImage) {
			return await onUploadImage(file);
		}
		return "";
	};

	return (
		<EditorRoot>
			<EditorContent
				extensions={extensions}
				initialContent={initialContent}
				onUpdate={({ editor }) => handleUpdate(editor as unknown as EditorInstance)}
				editorProps={{
					handleDOMEvents: {
						keydown: (_view, event) => handleCommandNavigation(event),
					},
					handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
					handleDrop: (view, event, _slice, moved) =>
						handleImageDrop(view, event, moved, uploadFn),
					attributes: {
						class:
							"prose prose-sm dark:prose-invert prose-headings:font-title focus:outline-none max-w-full min-h-[300px] px-4 py-3",
					},
				}}
				slotAfter={<ImageResizer />}
			>
				<EditorCommand
					onKeyDown={(e) => handleCommandNavigation(e)}
					className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all"
				>
					<EditorCommandEmpty className="px-2 text-muted-foreground">
						No results
					</EditorCommandEmpty>
				</EditorCommand>
			</EditorContent>
		</EditorRoot>
	);
}
