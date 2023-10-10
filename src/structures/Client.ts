/* eslint-disable multiline-ternary */
/* eslint-disable no-delete-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable key-spacing */
import fs from 'node:fs';

import { BSON } from 'bson';

import { uid } from 'uid';

import { Emitter } from './NodeEmitter';

import { ClientOptions, Pointer, Container, PredicateType, ResolvableType, SchemaObject, TableType } from '../types';

import Entity from './Entity';

import parsePath from '../helpers/parsePath';

import parseSrc from '../helpers/parseSrc';

import path from 'path';

import BaseSchema from './BaseSchema';

export interface Client {
	Options: ClientOptions;

	Database: string;

	Pointers: Map<string, Pointer>;

	Containers: Map<string, Container>;

	Path: string[];
}

export class Client {
	/**
	 * @typedef {Object} ClientOptions
	 * @property {string=} Path
	 */

	/**
	 * @typedef {function} PredicateType<T>
	 * @param {T} [value=]
	 * @param {number} [index=]
	 * @param {T[]} [array=]
	 */

	/**
	 * @typedef {(object[] | string[] | number[])} AnyArray
	 */

	/**
	 * @typedef {(string | object | AnyArray | number)} TypeResolvable
	 */


	/**
	 * @constructor
	 * @param {ClientOptions} Options - Put database name and path
	 */
	constructor(Options: ClientOptions) {
		this.Options = Options;

		if (typeof this.Options.Path === "undefined" || !this.Options.Path) {
			this.Options.Path = parseSrc();
		}
		else {
			this.Options.Path = path.join(...parsePath(this.Options.Path));
		}

		if (typeof this.Options.Buffer === "undefined")
			this.Options.Buffer = 512;

		this.Database = "none";

		this.Pointers = new Map();
		this.Containers = new Map();

		BSON.setInternalBufferSize(this.Options.Buffer);

		Emitter.emit("start");
	}

	private getBuffer(): number {
		if (typeof this.Options.Buffer === "undefined")
			this.Options.Buffer = 512;

		return this.Options.Buffer;
	}

	private getPath(): string {
		if (typeof this.Options.Path === "undefined")
			throw new Error("An error occurred and the path was not specified.");

		return this.Options.Path;
	}

	private getFolders(): boolean {
		if (!fs.existsSync(this.getPath()))
			throw new Error("(ODB-01) The path you specified was not found.");

		if (!fs.existsSync(path.join(this.getPath(), 'OpenDB')))
			throw new Error("(ODB-02) The database root folder not exists.");

		if (this.Database === "none")
			throw new Error("(ODB-10) The database is not configured.");

		if (!fs.existsSync(path.join(this.getPath(), 'OpenDB', this.Database)))
			throw new Error("(ODB-03) This database does not exist, read https://github.com/PrintfDead/OpenDB#readme to know how to fix this error.");
	
		return true;
	}

	/**
	 * @public
	 * @param {BSON.DeserializeOptions} [deserializeOptions=] - Deserialize Options
	 * @description Update cache after a change in the container, without the change having been made in the cache.
	 * @returns void
	 */
	public Update(deserializeOptions?: BSON.DeserializeOptions): void {
		if (!this.getFolders()) return;

		if (!deserializeOptions)
			deserializeOptions = { allowObjectSmallerThanBufferSize: true };
		else {
			if (!Object.keys(deserializeOptions).includes("allowObjectSmallerThanBufferSize") || deserializeOptions.allowObjectSmallerThanBufferSize === false || !deserializeOptions.allowObjectSmallerThanBufferSize) {
				deserializeOptions.allowObjectSmallerThanBufferSize = true;
			}
		}

		for (const file of fs.readdirSync(path.join(this.getPath(), 'OpenDB', this.Database, 'Containers'), { recursive: true })) {
			const _file = fs.readFileSync(path.join(this.getPath(), 'OpenDB', this.Database, 'Containers', file as string));

			let Document: Container[] = [];

			BSON.deserializeStream(_file, 0, 1, Document, 0, deserializeOptions);

			Document.forEach((container) => {
				if (!container.ID || !container.Tables) return;

				const _container: Container = {
					ID: container.ID,
					Tables: container.Tables
				}

				this.Containers.clear();
				this.Containers.set(container.ID, _container);
			});
		}
	}

	/**
	 * @public
	 * @async
	 * @description Create root folder
	 * @returns {Promise<this>}
	 */
	private async CreateRoot(): Promise<this> {
		if (!fs.existsSync(this.getPath()))
			throw new Error("(ODB-01) The path you specified was not found.");

		if (fs.existsSync(path.join(this.getPath(), 'OpenDB'))) {
			console.log("(Warn-01) The root folder already exists, nothing will be created and this function will be skipped.");

			return this;
		}

		await fs.promises.mkdir(path.join(this.getPath(), 'OpenDB'), { recursive: true })
			.catch((Error) => {
				if (Error) Emitter.emit("error", Error);
			});

		return this;
	}

	/**
	 * @public
	 * @async
	 * @param {string} Name - Database name
	 * @description Create database folder
	 * @returns {Promise<this>}
	 */
	private async CreateDatabase(Name: string): Promise<this> {
		if (!fs.existsSync(this.getPath()))
			throw new Error("(ODB-01) The path you specified was not found.");

		if (!fs.existsSync(path.join(this.getPath(), 'OpenDB')))
			await this.CreateRoot();

		if (fs.existsSync(path.join(this.getPath(), 'OpenDB', Name))) {
			console.log("(Warn-02) The database already exists.");

			return this;
		}

		await fs.promises.mkdir(path.join(this.getPath(), 'OpenDB', Name), { recursive: true })
			.catch((Error) => {
				if (Error) Emitter.emit("error", Error);
			});

		await fs.promises.mkdir(path.join(this.getPath(), 'OpenDB', Name, 'Pointers'), { recursive: true })
			.catch((Error) => {
				if (Error) Emitter.emit("error", Error);
			});

		await fs.promises.mkdir(path.join(this.getPath(), 'OpenDB', Name, 'Containers'), { recursive: true })
			.catch((Error) => {
				if (Error) Emitter.emit("error", Error);
			});

		return this;
	}

	/**
	 * @public
	 * @param {string} Name - Database name
	 * @param {BSON.DeserializeOptions} [deserializeOptions=] - Deserialize Options
	 * @description Set database
	 * @returns {this}
	 */
	public async InstanceDatabase(Name: string, deserializeOptions?: BSON.DeserializeOptions): Promise<this> {
		if (fs.existsSync(path.join(this.getPath(), 'OpenDB')))
			await this.CreateRoot();
		if (!fs.existsSync(path.join(this.getPath(), 'OpenDB', Name)))
			await this.CreateDatabase(Name);

		if (this.Database === "none")
			this.Database = Name;
		else {
			this.Database = Name;
		}

		if (!deserializeOptions)
			deserializeOptions = { allowObjectSmallerThanBufferSize: true };
		else {
			if (!Object.keys(deserializeOptions).includes("allowObjectSmallerThanBufferSize") || deserializeOptions.allowObjectSmallerThanBufferSize === false || !deserializeOptions.allowObjectSmallerThanBufferSize) {
				deserializeOptions.allowObjectSmallerThanBufferSize = true;
			}
		}

		for (const file of fs.readdirSync(path.join(this.getPath(), 'OpenDB', Name, 'Pointers'), { recursive: true })) {
			const pointerFile = fs.readFileSync(path.join(this.getPath(), 'OpenDB', Name, 'Pointers', file as string));

			const pointer = BSON.deserialize(pointerFile);

			const pointerDoc: Pointer = {
				ID: pointer.ID,
				Reference: pointer.Reference,
				Containers: pointer.Containers
			};

			this.Pointers.clear();
			this.Pointers.set(pointer.ID, pointerDoc);
		}

		for (const file of fs.readdirSync(path.join(this.getPath(), 'OpenDB', Name, 'Containers'), { recursive: true })) {
			const _file = fs.readFileSync(path.join(this.getPath(), 'OpenDB', Name, 'Containers', file as string));

			let Document: Container[] = [];

			BSON.deserializeStream(_file, 0, 1, Document, 0, deserializeOptions);

			Document.forEach((container) => {
				if (!container.ID || !container.Tables) return;

				const _container: Container = {
					ID: container.ID,
					Tables: container.Tables
				}

				this.Containers.clear();
				this.Containers.set(container.ID, _container);
			});
		}

		return this;
	}

	/**
	 * @public
	 * @async
	 * @param {(string|number)} Reference - Reference to find the pointer easier
	 * @description Create pointer
	 * @returns {Promise<void>}
	 */
	public async CreatePointer(Reference: string | number): Promise<void> {
		if (!this.getFolders()) return;

		if (this.GetPointer(Reference) !== undefined) {
			console.warn("(Warn-04) A pointer with this reference already exists, the pointer will not be created.");
			return;
		}

		const IDPointer = uid(16);
		const IDContainer = uid(18);

		const container = {
			ID: IDContainer,
			Tables: []
		};

		const pointer = {
			ID: IDPointer,
			Reference: Reference,
			Containers: [IDContainer]
		};

		await fs.promises.writeFile(path.join(this.getPath(), 'OpenDB', this.Database, 'Pointers', IDPointer + '.bson'), BSON.serialize(pointer))
			.catch((error) => {
				if (error) Emitter.emit("error", error);
			});

		await fs.promises.writeFile(path.join(this.getPath(), 'OpenDB', this.Database, 'Containers', IDContainer + '.bson'), BSON.serialize(container))
			.catch((error) => {
				if (error) Emitter.emit("error", error);
			});

		this.Pointers.set(IDPointer, pointer);
		this.Containers.set(IDContainer, container);
	}

	/**
	 * @public
	 * @param {(string|number)} Reference - Reference to find the pointer easier
	 * @description Get pointer
	 * @returns {BSON.Document}
	 */
	public GetPointer(Reference: string | number): BSON.Document | undefined {
		if (!this.getFolders()) return;

		let _pointer = undefined;

		this.Pointers.forEach((x) => {
			if (x.Reference === Reference) {
				_pointer = x;
			}
		});

		if (_pointer === undefined) {
			for (const file of fs.readdirSync(path.join(this.getPath(), 'OpenDB', this.Database, 'Pointers'))) {
				const pointerFile = fs.readFileSync(path.join(this.getPath(), 'OpenDB', this.Database, 'Pointers', file as string));
				const pointer = BSON.deserialize(pointerFile);

				if (Reference === pointer.Reference) {
					_pointer = pointer;
				}
			}
		}

		return _pointer;
	}

	/**
	 * @public
	 * @param {string} Container - Container ID
	 * @param {BSON.DeserializeOptions} [deserializeOptions=] - Deserialize Options
	 * @description Get Container
	 * @returns {BSON.Document}
	 */
	public GetContainer(Container: string, deserializeOptions?: BSON.DeserializeOptions): BSON.Document | undefined {
		if (!this.getFolders()) return;

		if (!this.Containers.get(Container)) {
			let _container = undefined;

			if (!deserializeOptions)
				deserializeOptions = { allowObjectSmallerThanBufferSize: true };
			else {
				if (!Object.keys(deserializeOptions).includes("allowObjectSmallerThanBufferSize") || deserializeOptions.allowObjectSmallerThanBufferSize === false || !deserializeOptions.allowObjectSmallerThanBufferSize) {
					deserializeOptions.allowObjectSmallerThanBufferSize = true;
				}
			}

			for (const file of fs.readdirSync(path.join(this.getPath(), 'OpenDB', this.Database, 'Containers'))) {
				const _file = fs.readFileSync(path.join(this.getPath(), 'OpenDB', this.Database, 'Containers', file as string));
				let Document: Container[] = [];

				BSON.deserializeStream(_file, 0, 1, Document, 0, deserializeOptions);

				Document.forEach((container) => {
					if (!container.ID || !container.Tables) return;

					if (container.ID === Container) _container = container;
				});
			}

			return _container;

		}
		else {
			return this.Containers.get(Container);
		}
	}

	public async Add(Reference: string | number, _schema: BaseSchema, values: ResolvableType[], Container?: string) {
		if (!this.getFolders()) return;

		let { schema, id, tableName } = _schema;
		const pointer = this.GetPointer(Reference) as Pointer;
		
		if (pointer === undefined)
			throw new Error("(ODB-05) Pointer not found.");

		const container = Container ? this.GetContainer(Container) : this.GetContainer(pointer.Containers[0]);

		if (!tableName)
			throw new Error("(ODB-12) The table name is not defined");

		if (schema.table.length == 0)
			throw new Error("");

		if (schema.table.length != values.length)
			throw new Error("");

		if (container === undefined)
			throw new Error("(ODB-06) Container not found.");

		schema.table.forEach((x, i) => {
			if (x.type != typeof values[i] && values[i] != "auto_increment")
				throw new Error("");

			if (x.type !== "number" && values[i] == "auto_increment")
				throw new Error("");

			x.value = values[i];
		});

		container.Tables.forEach((x: TableType) => {
			if (x.ID === id)
				throw new Error("(ODB-07) The id is already in use.");

			const _entity = x.$.find((x, i) => x.name == schema.table[i].name && x.name != "id");
			const _index = x.$.findIndex((x, i) => x.name == schema.table[i].name && x.name != "id");

			if (!_entity || _entity.type != schema.table[_index].type || _entity.primary != schema.table[_index].primary)
				throw new Error("(ODB-11) The schemes are not compatible.");
		});

		schema.table.forEach((x, i) => {
			if (x.value === "auto_increment") {
				x.value = container?.Tables.length + 1;
			}
		});

		container.Tables.push({ ID: id, Name: tableName, $: schema.table });

		const _container = {
			ID: container.ID,
			Tables: container.Tables
		};

		this.Containers.set(container.ID, _container);

		const buffer = Buffer.from(JSON.stringify(container));
		const serialize = BSON.serializeWithBufferAndIndex(container, buffer);

		await fs.promises.writeFile(path.join(this.getPath(), 'OpenDB', this.Database, 'Containers', container.ID + '.bson'), BSON.serialize(container, { index: serialize as number }))
			.catch((error) => {
				if (error) Emitter.emit("error", error);
			});

		return new Entity(id, schema.table, this.getPath(), this.Database, _container, this.getBuffer());
	}

	/**
	 * @public
	 * @param {(string|number)} Reference - Reference to find the pointer easier
	 * @param {string} [Container=false] - Container ID
	 * @description Add an existing container or not, to a pointer
	 * @returns {void}
	 */
	public async AddContainer(Reference: string | number, Container?: string | null): Promise<void> {
		if (!this.getFolders()) return;

		const Pointer = this.GetPointer(Reference);
		const containers = [];

		if (typeof Pointer === "undefined" || !Pointer)
			throw new Error("(ODB-05) Pointer not found");

		if (typeof Container === "string") {
			if (Container.length !== 18)
				throw new Error("(ODB-09) This ID is not correct");

			if (!this.Containers.get(Container))
				throw new Error("(ODB-09) This ID is not correct");

			containers.push(Container);
		}
		else {
			const ID = uid(18);
			containers.push(ID);

			const container = {
				ID: ID,
				Content: []
			};

			fs.writeFile(path.join(this.getPath(), 'OpenDB', this.Database, 'Containers', ID + '.bson'), BSON.serialize(container), (error) => {
				if (error) Emitter.emit("error", error);
			});
		}

		const pointer = {
			ID: Pointer.ID,
			Reference: Reference,
			Containers: containers
		};

		this.Pointers.set(Pointer.ID, {
			ID: Pointer.ID,
			Reference: Reference,
			Containers: containers
		});

		await fs.promises.writeFile(path.join(this.getPath(), 'OpenDB', this.Database, 'Pointers', pointer.ID + '.bson'), BSON.serialize(pointer))
			.catch((error) => {
				if (error) Emitter.emit("error", error);
			});
	}

	/**
	 * @public
	 * @param {(string|number)} Reference - Reference to find the pointer easier
	 * @param {PredicateType<T>} predicate - Predicate to find data
	 * @param {string} [Container=false] - Container ID
	 * @returns {(Table | undefined)}
	 */
	public Find(Reference: string | number, predicate: PredicateType<SchemaObject>, Container?: string): Entity | undefined {
		if (!this.getFolders()) return;

		const pointer = this.GetPointer(Reference) as Pointer;

		if (!pointer)
			throw new Error("(ODB-05) Pointer not found");

		const container = Container ? this.GetContainer(Container) as Container : this.GetContainer(pointer.Containers[0]) as Container;

		if (!container)
			throw new Error("(ODB-06) Container not found");

		let id: string | number | undefined
		let _container: SchemaObject[] | undefined;

		container.Tables.forEach((x) => {
			if (!x.$.find(predicate)) {
				_container = undefined;
				return undefined;
			}

			_container = x.$;

			id = x.ID;
		});

		if (!_container || !id) return undefined;

		return new Entity(id, _container, this.getPath(), this.Database, container, this.getBuffer());
	}

	/**
	 * @public
	 * @param {(string|number)} Reference - Reference to find the pointer easier
	 * @param {PredicateType<T>} predicate - Predicate to filter data
	 * @param {string} [Container=false] - Container ID
	 * @returns {(ContainerTable[] | undefined)}
	 */
	public Filter(Reference: string | number, predicate: PredicateType<SchemaObject>, Container?: string): SchemaObject[] {
		const pointer = this.GetPointer(Reference) as Pointer;

		if (!pointer)
			throw new Error("(ODB-05) Pointer not found");

		const container = Container ? this.GetContainer(Container) as Container : this.GetContainer(pointer.Containers[0]) as Container;

		if (!container)
			throw new Error("(ODB-06) Container not found");

		let _container: SchemaObject[] = [];

		if (!container)
			throw new Error("(ODB-06) Container not found");

		container.Tables.forEach((x) => {
			const _entity = x.$.find(predicate);

			if (!_entity)
				return;

			_container.push(_entity);
		});

		return _container;
	}

	/**
	 * @public
	 * @async
	 * @param {(string|number)} Reference - Reference to find the pointer easier
	 * @param {number} TableId - Table ID
	 * @param {string} [Container=false] - Container ID
	 * @description Delete Table
	 * @returns {Promise<void>}
	 */
	public async DeleteTable(Reference: string | number, TableId: number, Container?: string): Promise<void> {
		if (!this.getFolders()) return;

		const pointer = this.GetPointer(Reference);

		if (pointer === undefined)
			throw new Error("(ODB-05) Pointer not found.");
		
		const container = Container ? this.GetContainer(Container) as Container : this.GetContainer(pointer.Containers[0]) as Container;

		if (!container)
			throw new Error("(ODB-06) Container not found");
	}
}