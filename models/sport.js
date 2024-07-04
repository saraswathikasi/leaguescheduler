const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Sport extends Model {}

  Sport.init({
    sportName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // description: {
    //   type: DataTypes.TEXT,
    //   allowNull: true,
    // },
    // Add more attributes as needed
  }, {
    sequelize,
    modelName: 'Sport',
    // Other options
  });

  return Sport;
};
