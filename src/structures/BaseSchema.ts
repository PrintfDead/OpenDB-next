import Schema from "./Schema";

export default class BaseSchema {
    public static tableName: string;
    public static id: number | string;
    public static schema: Schema;

    public tableName!: string;
    public id!: number | string;
    public schema!: Schema;

    public static DefineTable(): Schema {
        return this.schema;
    }
}