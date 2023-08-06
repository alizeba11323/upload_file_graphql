import express from "express";
import http from "http";
import cors from "cors";
import { parse, join } from "path";
import bodyParser from "body-parser";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { gql } from "graphql-tag";
import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs";
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs";
import { createWriteStream } from "fs";
import { GraphQLError } from "graphql";
import multer from "multer";

(async function () {
  const app = express();
  const httpServer = http.createServer(app);
  const typeDefs = gql`
    scalar Upload
    type FileUploadResponse {
      message: String!
      url: String
    }
    type Post {
      id: ID!
      title: String!
      body: String!
      userId: ID!
    }
    type Query {
      hello: String!
      getAllPost: [Post!]!
    }
    type Mutation {
      fileUpload(file: Upload!): FileUploadResponse!
    }
  `;
  const resolvers = {
    Upload: GraphQLUpload,
    Query: {
      getAllPost: () => {
        fetch("https://jsonplaceholder.typicode.com/posts")
          .then((res) => {
            console.log(res);
            return res.json();
          })
          .then((result) => console.log(result))
          .catch((err) => console.log(err.message));
      },
    },
    Mutation: {
      fileUpload: async (parent, { file }, context, info) => {
        const { filename, createReadStream } = await file;
        const stream = createReadStream();
        let { ext, name } = parse(filename);
        name = `single-${name}-${Date.now()}`;
        let url = join(process.cwd(), `./uploads/${name}${ext}`);
        console.log(url);
        const ImageWriteStream = await createWriteStream(url);
        await stream.pipe(ImageWriteStream);
        url = `http://localhost:4000/${name}${ext}`;
        return {
          message: "File Uploaded Successfully",
          url,
        };
      },
    },
  };
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const server = new ApolloServer({ schema });
  await server.start();
  //rest api
  app.use("/users", (req, res) => {});

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "./uploads");
    },
    filename: (req, file, cb) => {
      console.log(file);
      cb(null, `${Date.now() + "-" + file.originalname}`);
    },
  });
  const upload = multer({ storage });
  app.post("/fileUploads", upload.single("image"), function (req, res) {
    res.status(200).json({
      message: "file uploaded successfully",
      url: `http://localhost:4000/${req.file.path.split("\\")[1]}`,
    });
  });
  app.use(express.static("uploads"));
  app.use(graphqlUploadExpress());
  app.use("/graphql", cors(), bodyParser.json(), expressMiddleware(server));
  httpServer.listen(4000, function () {
    console.log("app running on port http://localhost:4000/graphql");
  });
})();
