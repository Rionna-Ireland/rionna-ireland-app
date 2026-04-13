import { NewsForm } from "@admin/component/news/NewsForm";

export default async function AdminNewsEditPage({
	params,
}: {
	params: Promise<{ newsPostId: string }>;
}) {
	const { newsPostId } = await params;

	return <NewsForm newsPostId={newsPostId} />;
}
