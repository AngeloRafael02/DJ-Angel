import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

dotenv.config();

const CONNECTION_STRING = process.env.CONNECTION_STRING;
if (!CONNECTION_STRING) {
    throw new Error("Missing CONNECTION_STRING environment variable.");
}

const DATABASE_NAME = process.env.DATABASE_NAME;
if (!DATABASE_NAME) {
    throw new Error("Missing DATABASE_NAME environment variable.");
}

const client = new MongoClient(CONNECTION_STRING, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    }
});

(async () => {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
})();

export const db = client.db(DATABASE_NAME);

export type GuildSettingsDocument = {
    guild_id: string;
    voice_channel_id?: string;
    text_channel_id?: string;
    updated_at?: Date;
};

export type DriveCacheDocument = {
    _id: string;
    id: string;
    createdTime: string;
    mimeType: string;
    name: string;
    folder_id: string;
};

export type DriveFolderDocument = {
    _id: string;
    short_id: string;
    name: string;
    folder_path?: string;
};

export type MetadataDocument = {
    key: string;
    expiry: number;
};

export const guildSettingsCollection = db.collection<GuildSettingsDocument>("guild_settings");
export const driveCacheCollection = db.collection<DriveCacheDocument>("drive_cache");
export const driveFoldersCollection = db.collection<DriveFolderDocument>("drive_folders");
export const metadataCollection = db.collection<MetadataDocument>("metadata");