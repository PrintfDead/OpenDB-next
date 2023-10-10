import { Container, TableType, SchemaObject, ResolvableType } from "../types";
import path from 'path';
import fs from 'fs';
import BSON from 'bson';
import { Emitter } from "./NodeEmitter";
import BaseSchema from "./BaseSchema";

export default class Entity {
    public readonly ID: string | number;
    public Table: SchemaObject[];
    private Path: string;
    private Database: string;
    private Container: Container
    private Buffer: number;

    /**
     * @constructor
     * @param {(string | number)} ID - Table ID 
     * @param {TableType} Table - Table Content
     * @param {string} Path - Database path
     * @param {string} Database - Database name 
     * @param {Container} Container - Container
     */
    constructor(ID: string | number, Table: SchemaObject[], Path: string, Database: string, Container: Container, Buffer: number) {
        this.ID = ID;
        this.Table = Table;
        this.Path = Path;
        this.Database = Database;
        this.Container = Container;
        this.Buffer = Buffer;
    }

    /**
     * @public
     * @async
     * @description save table
     * @returns void
     */
    public async save(): Promise<void> {
        if (!fs.existsSync(this.Path))
			throw new Error("(ODB-01) The path you specified was not found.");

		if (!fs.existsSync(path.join(this.Path, 'OpenDB')))
			throw new Error("(ODB-02) The database root folder not exists.");
		
		if (this.Database === "none") 
			throw new Error("(ODB-10) The database is not configured.");

		if (!fs.existsSync(path.join(this.Path, 'OpenDB', this.Database)))
			throw new Error("(ODB-03) This database does not exist, read https://github.com/PrintfDead/OpenDB#readme to know how to fix this error.");

        this.Container.Tables.forEach((x) => {
            if (x.ID === this.ID) {
                x.$ = this.Table;
            }
        });

        console.log(this.Container);

        const buffer = Buffer.alloc(this.Buffer, JSON.stringify(this.Container));
		const serialize = BSON.serializeWithBufferAndIndex(this.Container, buffer);

        await fs.promises.writeFile(path.join(this.Path, 'OpenDB', this.Database, 'Containers', this.Container.ID+'.bson'), BSON.serialize(this.Container, { index: serialize as number }))
				.catch((error) =>
				{
					if (error) Emitter.emit("error", error);
				});
    }
}