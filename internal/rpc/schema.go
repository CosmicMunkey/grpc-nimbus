package rpc

import (
	"github.com/jhump/protoreflect/desc"
	descriptorpb "google.golang.org/protobuf/types/descriptorpb"
)

// FieldSchema describes a single proto field for the form-builder UI.
type FieldSchema struct {
	Name     string `json:"name"`
	JSONName string `json:"jsonName"`
	Number   int32  `json:"number"`
	// Type is one of: "string", "bytes", "bool", "int32", "int64", "uint32", "uint64",
	// "float", "double", "enum", "message", "map", "timestamp",
	// "bool_value", "string_value", "bytes_value", "int32_value", "int64_value",
	// "uint32_value", "uint64_value", "float_value", "double_value".
	Type           string        `json:"type"`
	IsRepeated     bool          `json:"isRepeated"` // true only for non-map repeated fields
	IsMap          bool          `json:"isMap"`
	OneofName      string        `json:"oneofName,omitempty"`
	EnumValues     []EnumValue   `json:"enumValues,omitempty"`
	Fields         []FieldSchema `json:"fields,omitempty"`         // for message type
	MapKeyType     string        `json:"mapKeyType,omitempty"`     // for map type
	MapValueType   string        `json:"mapValueType,omitempty"`   // for map type
	MapValueFields []FieldSchema `json:"mapValueFields,omitempty"` // when map value is message
	IsFieldMask    bool          `json:"isFieldMask,omitempty"`    // true for google.protobuf.FieldMask
}

// EnumValue is a single enum name/number pair.
type EnumValue struct {
	Name   string `json:"name"`
	Number int32  `json:"number"`
}

// GetRequestSchema returns the ordered list of field schemas for a method's input message.
func (pd *ProtosetDescriptor) GetRequestSchema(methodPath string) ([]FieldSchema, error) {
	md, err := pd.FindMethod(methodPath)
	if err != nil {
		return nil, err
	}
	visited := make(map[string]bool)
	return buildMessageFields(md.GetInputType(), visited, 0), nil
}

// buildMessageFields converts a MessageDescriptor into a slice of FieldSchema.
// visited tracks fully-qualified message names on the current recursion path to break cycles.
func buildMessageFields(msg *desc.MessageDescriptor, visited map[string]bool, depth int) []FieldSchema {
	if msg == nil || depth > 8 {
		return nil
	}
	fqn := msg.GetFullyQualifiedName()
	if visited[fqn] {
		return nil // cycle detected
	}
	visited[fqn] = true
	defer delete(visited, fqn)

	allFields := msg.GetFields()
	result := make([]FieldSchema, 0, len(allFields))
	for _, fd := range allFields {
		result = append(result, buildFieldSchema(fd, visited, depth+1))
	}
	return result
}

func buildFieldSchema(fd *desc.FieldDescriptor, visited map[string]bool, depth int) FieldSchema {
	fs := FieldSchema{
		Name:       fd.GetName(),
		JSONName:   fd.GetJSONName(),
		Number:     fd.GetNumber(),
		IsRepeated: fd.IsRepeated() && !fd.IsMap(),
		IsMap:      fd.IsMap(),
	}
	if oo := fd.GetOneOf(); oo != nil {
		fs.OneofName = oo.GetName()
	}

	switch fd.GetType() {
	case descriptorpb.FieldDescriptorProto_TYPE_STRING:
		fs.Type = "string"
	case descriptorpb.FieldDescriptorProto_TYPE_BYTES:
		fs.Type = "bytes"
	case descriptorpb.FieldDescriptorProto_TYPE_BOOL:
		fs.Type = "bool"
	case descriptorpb.FieldDescriptorProto_TYPE_INT32,
		descriptorpb.FieldDescriptorProto_TYPE_SINT32,
		descriptorpb.FieldDescriptorProto_TYPE_SFIXED32:
		fs.Type = "int32"
	case descriptorpb.FieldDescriptorProto_TYPE_INT64,
		descriptorpb.FieldDescriptorProto_TYPE_SINT64,
		descriptorpb.FieldDescriptorProto_TYPE_SFIXED64:
		fs.Type = "int64"
	case descriptorpb.FieldDescriptorProto_TYPE_UINT32,
		descriptorpb.FieldDescriptorProto_TYPE_FIXED32:
		fs.Type = "uint32"
	case descriptorpb.FieldDescriptorProto_TYPE_UINT64,
		descriptorpb.FieldDescriptorProto_TYPE_FIXED64:
		fs.Type = "uint64"
	case descriptorpb.FieldDescriptorProto_TYPE_FLOAT:
		fs.Type = "float"
	case descriptorpb.FieldDescriptorProto_TYPE_DOUBLE:
		fs.Type = "double"
	case descriptorpb.FieldDescriptorProto_TYPE_ENUM:
		fs.Type = "enum"
		if et := fd.GetEnumType(); et != nil {
			for _, ev := range et.GetValues() {
				fs.EnumValues = append(fs.EnumValues, EnumValue{
					Name:   ev.GetName(),
					Number: ev.GetNumber(),
				})
			}
		}
	case descriptorpb.FieldDescriptorProto_TYPE_MESSAGE,
		descriptorpb.FieldDescriptorProto_TYPE_GROUP:
		if fd.IsMap() {
			fs.Type = "map"
			if kf := fd.GetMapKeyType(); kf != nil {
				fs.MapKeyType = scalarTypeName(kf.GetType())
			}
			if vf := fd.GetMapValueType(); vf != nil {
				vType := vf.GetType()
				if vType == descriptorpb.FieldDescriptorProto_TYPE_MESSAGE {
					fs.MapValueType = "message"
					fs.MapValueFields = buildMessageFields(vf.GetMessageType(), visited, depth)
				} else {
					fs.MapValueType = scalarTypeName(vType)
				}
			}
		} else if mt := fd.GetMessageType(); mt != nil && mt.GetFullyQualifiedName() == "google.protobuf.Timestamp" {
			fs.Type = "timestamp"
		} else if mt := fd.GetMessageType(); mt != nil && mt.GetFullyQualifiedName() == "google.protobuf.FieldMask" {
			fs.Type = "message"
			fs.IsFieldMask = true
			fs.Fields = buildMessageFields(fd.GetMessageType(), visited, depth)
		} else if mt := fd.GetMessageType(); mt != nil {
			if wname, ok := wrapperTypeName(mt.GetFullyQualifiedName()); ok {
				fs.Type = wname
			} else {
				fs.Type = "message"
				fs.Fields = buildMessageFields(fd.GetMessageType(), visited, depth)
			}
		}
	default:
		fs.Type = "string"
	}
	return fs
}

// wrapperTypeName maps a fully-qualified well-known wrapper type name to its
// schema type string, e.g. "google.protobuf.BoolValue" → "bool_value".
// Returns ("", false) if fqn is not a well-known wrapper type.
func wrapperTypeName(fqn string) (string, bool) {
	switch fqn {
	case "google.protobuf.DoubleValue":
		return "double_value", true
	case "google.protobuf.FloatValue":
		return "float_value", true
	case "google.protobuf.Int64Value":
		return "int64_value", true
	case "google.protobuf.UInt64Value":
		return "uint64_value", true
	case "google.protobuf.Int32Value":
		return "int32_value", true
	case "google.protobuf.UInt32Value":
		return "uint32_value", true
	case "google.protobuf.BoolValue":
		return "bool_value", true
	case "google.protobuf.StringValue":
		return "string_value", true
	case "google.protobuf.BytesValue":
		return "bytes_value", true
	}
	return "", false
}

func scalarTypeName(t descriptorpb.FieldDescriptorProto_Type) string {
	switch t {
	case descriptorpb.FieldDescriptorProto_TYPE_STRING:
		return "string"
	case descriptorpb.FieldDescriptorProto_TYPE_BYTES:
		return "bytes"
	case descriptorpb.FieldDescriptorProto_TYPE_BOOL:
		return "bool"
	case descriptorpb.FieldDescriptorProto_TYPE_INT32, descriptorpb.FieldDescriptorProto_TYPE_SINT32, descriptorpb.FieldDescriptorProto_TYPE_SFIXED32:
		return "int32"
	case descriptorpb.FieldDescriptorProto_TYPE_INT64, descriptorpb.FieldDescriptorProto_TYPE_SINT64, descriptorpb.FieldDescriptorProto_TYPE_SFIXED64:
		return "int64"
	case descriptorpb.FieldDescriptorProto_TYPE_UINT32, descriptorpb.FieldDescriptorProto_TYPE_FIXED32:
		return "uint32"
	case descriptorpb.FieldDescriptorProto_TYPE_UINT64, descriptorpb.FieldDescriptorProto_TYPE_FIXED64:
		return "uint64"
	case descriptorpb.FieldDescriptorProto_TYPE_FLOAT:
		return "float"
	case descriptorpb.FieldDescriptorProto_TYPE_DOUBLE:
		return "double"
	case descriptorpb.FieldDescriptorProto_TYPE_ENUM:
		return "enum"
	case descriptorpb.FieldDescriptorProto_TYPE_MESSAGE, descriptorpb.FieldDescriptorProto_TYPE_GROUP:
		return "message"
	default:
		return "string"
	}
}
