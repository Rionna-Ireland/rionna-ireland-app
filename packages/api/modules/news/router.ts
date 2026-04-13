import { createNewsImageUploadUrl } from "./procedures/create-news-image-upload-url";
import { createNewsPost } from "./procedures/create-news-post";
import { deleteNewsPost } from "./procedures/delete-news-post";
import { getNewsPost } from "./procedures/get-news-post";
import { getPublishedNewsPost } from "./procedures/get-published-news-post";
import { listNewsPosts } from "./procedures/list-news-posts";
import { listPublishedNews } from "./procedures/list-published-news";
import { updateNewsPost } from "./procedures/update-news-post";

export const newsRouter = {
	admin: {
		list: listNewsPosts,
		find: getNewsPost,
		create: createNewsPost,
		update: updateNewsPost,
		delete: deleteNewsPost,
		createImageUploadUrl: createNewsImageUploadUrl,
	},
	listPublished: listPublishedNews,
	findPublished: getPublishedNewsPost,
};
