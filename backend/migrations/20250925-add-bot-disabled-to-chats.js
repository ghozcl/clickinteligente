"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Chats", "botDisabled", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn("Chats", "disabledReason", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Chats", "disabledBy", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Chats", "disabledAt", {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Chats", "botDisabled");
    await queryInterface.removeColumn("Chats", "disabledReason");
    await queryInterface.removeColumn("Chats", "disabledBy");
    await queryInterface.removeColumn("Chats", "disabledAt");
  }
};
