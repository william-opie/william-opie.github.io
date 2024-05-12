// tina/config.ts
import { defineConfig } from "tinacms";
var config_default = defineConfig({
  build: {
    outputFolder: "admin",
    publicFolder: "public"
  },
  search: {
    tina: {
      indexerToken: "",
      stopwordLanguages: ["eng"]
    },
    indexBatchSize: 100,
    maxSearchIndexFieldLength: 100
  },
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "assets"
    }
  },
  schema: {
    collections: [
      {
        name: "post",
        label: "Posts",
        path: "_posts",
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              const date = /* @__PURE__ */ new Date();
              const day = date.getDate();
              const month = date.getMonth() + 1;
              const year = date.getFullYear();
              let currentDate = `${year}-${month}-${day}`;
              return `${currentDate}-${values?.title?.toLowerCase().replace(/ /g, "-")}`;
            }
          }
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true
          },
          {
            type: "datetime",
            name: "date",
            label: "Date",
            ui: {
              timeFormat: "HH:mm"
            },
            required: true
          },
          {
            name: "published",
            label: "Published",
            type: "boolean",
            required: true,
            description: "If this is set to true, the post will be published"
          },
          {
            type: "string",
            name: "author",
            label: "Author",
            required: true
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true
          }
        ]
      }
    ]
  }
});
export {
  config_default as default
};
