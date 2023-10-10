import path from 'path';
import Schema from '../structures/Schema';
import BaseSchema from '../structures/BaseSchema';
import { uid } from 'uid';

export class TestSchema extends BaseSchema {
    public static tableName = "Test";
    public static id = uid(18);
    public static schema = new Schema();

    public static DefineTable(): Schema {

        this.schema.number("id").primary();
        this.schema.string("name");

        return this.schema;
    }
}

export class UserSchema extends BaseSchema {
    public static tableName = "Test";
    public static id = uid(18);
    public static schema = new Schema();

    public static DefineTable(): Schema {
        this.schema.number("id").primary();
        this.schema.string("username");

        return this.schema;
    }
}