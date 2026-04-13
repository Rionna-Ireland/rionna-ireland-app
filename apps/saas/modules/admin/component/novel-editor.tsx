"use client";

import {
	type JSONContent,
	EditorRoot,
	EditorContent,
	EditorCommand,
	EditorCommandEmpty,
	type EditorInstance,
	handleCommandNavigation,
	ImageResizer,
	handleImageDrop,
	handleImagePaste,
	StarterKit,
	TiptapImage,
	TiptapLink,
	TiptapUnderline,
	Placeholder,
	TaskItem,
	TaskList,
} from "novel";

interface NovelEditorProps {
	initialContent?: JSONContent;
	onChange?: (data: { json: JSONContent; html: string }) => void;
	onUploadImage?: (file: File) => Promise<string>;
}

export function NovelEditor({ initialContent, onChange, onUploadImage }: NovelEditorProps) {
	const extensions = [
		StarterKit.configure({
			heading: { levels: [1, 2, 3] },
		}),
		TiptapImage,
		TiptapLink.configure({ openOnClick: false }),
		TiptapUnderline,
		Placeholder.configure({ placeholder: "Start writing..." }),
		TaskList,
		TaskItem.configure({ nested: true }),
	];

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
				onUpdate={({ editor }: { editor: EditorInstance }) => handleUpdate(editor)}
				editorProps={{
					handleDOMEvents: {
						keydown: (_view: unknown, event: KeyboardEvent) =>
							handleCommandNavigation(event),
					},
					handlePaste: (view: unknown, event: ClipboardEvent) =>
						handleImagePaste(view as never, event, uploadFn),
					handleDrop: (view: unknown, event: DragEvent, _slice: unknown, moved: boolean) =>
						handleImageDrop(view as never, event, moved, uploadFn),
					attributes: {
						class: "prose prose-sm dark:prose-invert prose-headings:font-title focus:outline-none max-w-full min-h-[300px] px-4 py-3",
					},
				}}
				slotAfter={<ImageResizer />}
			>
				<EditorCommand
					onKeyDown={(e: React.KeyboardEvent) =>
						handleCommandNavigation(e.nativeEvent)
					}
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
